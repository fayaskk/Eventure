import { User } from "../../../models/user.model.js";
import bcrypt from "bcrypt";
import { OTP } from "../../../models/otp.model.js";
import { sendOTPEmail } from "../../../services/email.service.js";
import {
  generateAndStoreOTP,
  verifyOTPCode,
} from "../../../services/otp.service.js";

import {
  generateToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "../../../utils/jwt.js";

export const signup = async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    const normalizedName = name.trim();

    if (normalizedName.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!strongPassword.test(password)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain uppercase, lowercase, number and minimum 8 characters",
      });
    }

    const emailExist = await User.findOne({
      email: normalizedEmail,
    });

    if (emailExist) {
      if (emailExist.isVerified) {
        return res.status(409).json({
          message: "An account with this email already exists. Please sign in.",
        });
      }

      if (!emailExist.isVerified) {
        const otp = await generateAndStoreOTP(normalizedEmail);

        await sendOTPEmail(normalizedEmail, otp);

        console.log(`OTP for ${normalizedEmail}: ${otp}`);

        return res.status(200).json({
          message:
            "Your account already exists but is not verified. A new OTP has been sent.",
          requiresVerification: true,
        });
      }
    }

    let referredBy = null;

    if (referralCode) {
      const referrer = await User.findOne({
        referralCode: referralCode.trim().toUpperCase(),
      });

      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: "Invalid referral code",
        });
      }

      referredBy = referrer._id;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const generatedReferralCode =
      normalizedName.substring(0, 4).toUpperCase() +
      Math.random().toString(36).slice(2, 6).toUpperCase();

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      referralCode: generatedReferralCode,
      referredBy,
    });

    const otp = await generateAndStoreOTP(normalizedEmail);

    await sendOTPEmail(normalizedEmail, otp);

    console.log(`OTP for ${normalizedEmail}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error("Signup error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const googleCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Authentication</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage(
                {
                  type: "google-auth-error",
                  error: "google-auth-failed"
                },
                window.location.origin
              );
            }

            window.close();
          </script>
        </body>
        </html>
      `);
    }

    if (user.isBlocked) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Authentication</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage(
                {
                  type: "google-auth-error",
                  error: "blocked"
                },
                window.location.origin
              );
            }

            window.close();
          </script>
        </body>
        </html>
      `);
    }

    if (user.isDeleted) {
      return res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Google Authentication</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage(
                {
                  type: "google-auth-error",
                  error: "deleted"
                },
                window.location.origin
              );
            }

            window.close();
          </script>
        </body>
        </html>
      `);
    }

    const token = generateToken(user);

    const safeToken = JSON.stringify(token);

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Authentication</title>
      </head>
      <body>
        <script>
          const token = ${safeToken};

          if (window.opener) {
            window.opener.postMessage(
              {
                type: "google-auth-success",
                token: token
              },
              window.location.origin
            );

            window.close();
          } else {
            window.location.replace("/login");
          }
        </script>
      </body>
      </html>
    `);
  } catch (error) {
    console.error(
      "Google authentication callback error:",
      error
    );

    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google Authentication</title>
      </head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage(
              {
                type: "google-auth-error",
                error: "google-auth-failed"
              },
              window.location.origin
            );

            window.close();
          } else {
            window.location.replace("/login");
          }
        </script>
      </body>
      </html>
    `);
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const normalizedOTP = otp.trim();

    const result = await verifyOTPCode(normalizedEmail, normalizedOTP);

    if (!result.success) {
      return res.status(400).json(result);
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isVerified = true;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("OTP verification error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User does not exist",
      });
    }

    if (user.isVerified) {
      return res.status(409).json({
        success: false,
        message: "User is already verified",
      });
    }

    const otp = await generateAndStoreOTP(normalizedEmail);

    await sendOTPEmail(normalizedEmail, otp);

    return res.status(200).json({
      success: true,
      message: "A new OTP has been sent to your email",
    });
  } catch (error) {
    console.error("Resend OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const userLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Blocked by organization",
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: "Email is not verified",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account uses Google sign-in. Please continue with Google.",
      });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    if (!isPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successfull",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const otp = await generateAndStoreOTP(normalizedEmail);

    await sendOTPEmail(normalizedEmail, otp);

    console.log(`OTP for ${normalizedEmail}: ${otp}`);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
    });
  } catch (error) {
    console.error("User forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const verifyForgotPasswordOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedOTP = otp.trim();
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    const user = await User.findOne({
      email: normalizedEmail,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const result = await verifyOTPCode(normalizedEmail, normalizedOTP);

    if (!result.success) {
      return res.status(400).json(result);
    }

    const resetToken = generatePasswordResetToken(user);

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error("Verify forgot password OTP error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token, new password and confirm password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!strongPassword.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain uppercase, lowercase, number and minimum 8 characters",
      });
    }

    let decoded;

    try {
      decoded = verifyPasswordResetToken(resetToken);
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    if (decoded.purpose !== "password-reset") {
      return res.status(401).json({
        success: false,
        message: "Invalid reset token",
      });
    }

    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};