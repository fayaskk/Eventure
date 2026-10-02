import {
  adminLoginService,
  adminForgotPasswordService,
  adminVerifyForgotPasswordOTPService,
  adminResetPasswordService,
} from "../../../services/adminAuth.service.js";

export const adminLogin = async (
  req,
  res,
) => {
  try {
    const { email, password } =
      req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message:
          "Email and password are required",
      });
    }

    const result =
      await adminLoginService(
        email,
        password,
      );

    return res.status(200).json({
      success: true,
      message:
        "Admin login successful",
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    console.error(
      "Admin login error:",
      error,
    );

    return res
      .status(
        error.statusCode || 500,
      )
      .json({
        success: false,
        message:
          error.message ||
          "Internal server error",
      });
  }
};

export const adminForgotPassword =
  async (req, res) => {
    try {
      const { email } =
        req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email required",
        });
      }

      await adminForgotPasswordService(
        email,
      );

      return res.status(200).json({
        success: true,
        message:
          "OTP sent to your email",
      });
    } catch (error) {
      console.error(
        "Admin Forgot Password error:",
        error,
      );

      return res
        .status(
          error.statusCode || 500,
        )
        .json({
          success: false,
          message:
            error.message ||
            "Server Error",
        });
    }
  };

export const adminVerifyForgotPasswordOTP =
  async (req, res) => {
    try {
      const { email, otp } =
        req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message:
            "Email and OTP are required",
        });
      }

      const resetToken =
        await adminVerifyForgotPasswordOTPService(
          email,
          otp,
        );

      return res.status(200).json({
        success: true,
        message:
          "OTP verified successfully",
        resetToken,
      });
    } catch (error) {
      console.error(
        "Admin OTP verification error:",
        error,
      );

      return res
        .status(
          error.statusCode || 500,
        )
        .json({
          success: false,
          message:
            error.message ||
            "Internal server error",
        });
    }
  };

export const adminResetPassword =
  async (req, res) => {
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
        newPassword !==
        confirmPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Passwords do not match",
        });
      }

      const strongPassword =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

      if (
        !strongPassword.test(
          newPassword,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain uppercase, lowercase, number and minimum 8 characters",
        });
      }

      await adminResetPasswordService(
        resetToken,
        newPassword,
      );

      return res.status(200).json({
        success: true,
        message:
          "Password reset successfully",
      });
    } catch (error) {
      console.error(
        "Admin Reset-password error:",
        error,
      );

      return res
        .status(
          error.statusCode || 500,
        )
        .json({
          success: false,
          message:
            error.message ||
            "Server Error",
        });
    }
  };
 
 
