import {
  adminChangePasswordService,
  adminRequestEmailChangeService,
  adminVerifyEmailChangeService,
  adminGetProfileService,
  adminUpdateProfileService,
} from "../../../services/admin.service.js";

export const adminChangePassword =
  async (req, res) => {
    try {
      const adminId =
        req.user.userId;

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
          message:
            "All fields are required",
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

      await adminChangePasswordService(
        adminId,
        currentPassword,
        newPassword,
      );

      return res.status(200).json({
        success: true,
        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Admin Change Password error:",
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

export const adminRequestEmailChange =
  async (req, res) => {
    try {
      const adminId =
        req.user.userId;

      const { newEmail } =
        req.body;

      if (!newEmail) {
        return res.status(400).json({
          success: false,
          message: "Email required",
        });
      }

      await adminRequestEmailChangeService(
        adminId,
        newEmail,
      );

      return res.status(200).json({
        success: true,
        message:
          "Verification OTP sent to the new email",
      });
    } catch (error) {
      console.error(
        "Admin Email Change error:",
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

export const adminVerifyEmailChangeOTP =
  async (req, res) => {
    try {
      const {
        newEmail,
        otp,
      } = req.body;

      if (!otp || !newEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Email and OTP are required",
        });
      }

      if (typeof otp !== "string") {
        return res.status(400).json({
          success: false,
          message:
            "Invalid OTP format",
        });
      }

      const adminId =
        req.user.userId;

      await adminVerifyEmailChangeService(
        adminId,
        newEmail,
        otp,
      );

      return res.status(200).json({
        success: true,
        message:
          "Email updated successfully",
      });
    } catch (error) {
      console.error(
        "Admin Verify Email Change error:",
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

export const adminGetProfile =
  async (req, res) => {
    try {
      const adminId =
        req.user.userId;

      const profile =
        await adminGetProfileService(
          adminId,
        );

      return res.status(200).json({
        success: true,
        message:
          "Admin Profile Fetching Successful",
        data: profile,
      });
    } catch (error) {
      console.error(
        "Admin Get Profile error:",
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

export const adminUpdateProfile =
  async (req, res) => {
    try {
      const adminId =
        req.user.userId;

      const { name } =
        req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          message:
            "Name is required",
        });
      }

      if (typeof name !== "string") {
        return res.status(400).json({
          success: false,
          message:
            "Name should be a string",
        });
      }

      await adminUpdateProfileService(
        adminId,
        name,
      );

      return res.status(200).json({
        success: true,
        message:
          "Admin profile updated successfully",
      });
    } catch (error) {
      console.error(
        "Admin Profile Update Error:",
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