import {
  hostLoginService,
  hostForgotPasswordService,
  hostVerifyForgotPasswordOTPService,
  hostResetPasswordService,
  hostChangePasswordService,
  hostRequestEmailChangeService,
  hostVerifyEmailChangeOTPService,
} from "../../../services/hostAuth.service.js";

export const hostLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email & Password required",
      });
    }

    const token = await hostLoginService(
      email,
      password,
    );

    return res.status(200).json({
      success: true,
      message: "Login successfull",
      token,
    });
  } catch (error) {
    console.error("Host LogIn error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};

export const hostForgotPassword = async (
  req,
  res,
) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email Required",
      });
    }

    await hostForgotPasswordService(email);

    return res.status(200).json({
      success: true,
      message: "OTP sent to your Email",
    });
  } catch (error) {
    console.error(
      "Host Forgot Password error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};

export const hostVerifyForgotPasswordOTP = async (
  req,
  res,
) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const resetToken =
      await hostVerifyForgotPasswordOTPService(
        email,
        otp,
      );

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error(
      "Host OTP verification error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Internal server error",
    });
  }
};

export const hostResetPassword = async (
  req,
  res,
) => {
  try {
    const {
      resetToken,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      !resetToken ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Reset token, new password and confirm password are required",
      });
    }

    if (
      newPassword !== confirmPassword
    ) {
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

    await hostResetPasswordService(
      resetToken,
      newPassword,
    );

    return res.status(200).json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    console.error(
      "Host Reset-password error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};

export const hostChangePassword = async (
  req,
  res,
) => {
  try {
    const userId = req.user.userId;

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message: "Fields Required",
      });
    }

    if (
      newPassword !== confirmPassword
    ) {
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

    await hostChangePasswordService(
      userId,
      currentPassword,
      newPassword,
    );

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error(
      "Host Change Password error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};

export const hostRequestEmailChange = async (
  req,
  res,
) => {
  try {
    const userId = req.user.userId;
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "Email required",
      });
    }

    await hostRequestEmailChangeService(
      userId,
      newEmail,
    );

    return res.status(200).json({
      success: true,
      message:
        "Verification OTP sent to the new email",
    });
  } catch (error) {
    console.error(
      "Host Email Change error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};

export const hostVerifyEmailChangeOTP = async (
  req,
  res,
) => {
  try {
    const { newEmail, otp } = req.body;

    if (!otp || !newEmail) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const userId = req.user.userId;

    await hostVerifyEmailChangeOTPService(
      userId,
      newEmail,
      otp,
    );

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
    });
  } catch (error) {
    console.error(
      "Host Verify Email Change error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};