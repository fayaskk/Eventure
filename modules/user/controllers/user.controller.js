import {
  getUserProfileService,
  updateUserProfileService,
  changeUserPasswordService,
  requestUserEmailChangeService,
  verifyUserEmailChangeService,
  getUserAccountStatusService,
} from "../../../services/user.service.js";

export const changePassword = async (
  req,
  res,
) => {
  try {
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
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords don't match",
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

    const userId = req.user.userId;

    await changeUserPasswordService(
      userId,
      currentPassword,
      newPassword,
    );

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error(
      "Change Password error:",
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

export const requestEmailChange = async (
  req,
  res,
) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "Email required",
      });
    }

    await requestUserEmailChangeService(
      newEmail,
    );

    return res.status(200).json({
      success: true,
      message: "OTP sent to new email",
    });
  } catch (error) {
    console.error(
      "Email change error:",
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

export const verifyEmailChangeOTP = async (
  req,
  res,
) => {
  try {
    const { newEmail, otp } = req.body;

    if (!otp || !newEmail) {
      return res.status(400).json({
        success: false,
        message:
          "Email and OTP are required",
      });
    }

    const userId = req.user.userId;

    await verifyUserEmailChangeService(
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
      "Verify email error:",
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

export const getProfile = async (
  req,
  res,
) => {
  try {
    const userId = req.user.userId;

    const profile =
      await getUserProfileService(userId);

    return res.status(200).json({
      success: true,
      message:
        "Profile fetched successfully",
      data: profile,
    });
  } catch (error) {
    console.error(
      "Profile fetching error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server error",
    });
  }
};

export const updateProfile = async (
  req,
  res,
) => {
  try {
    const userId = req.user.userId;

    const { name, language } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Name field is required",
      });
    }

    if (!language) {
      return res.status(400).json({
        success: false,
        message:
          "Language field is required",
      });
    }

    const data =
      await updateUserProfileService(
        userId,
        name,
        language,
      );

    return res.status(200).json({
      success: true,
      message: "User Profile Updated",
      data,
    });
  } catch (error) {
    console.error(
      "User Profile Update error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};

export const getAccountStatus = async (
  req,
  res,
) => {
  try {
    const userId = req.user.userId;

    const account =
      await getUserAccountStatusService(
        userId,
      );

    return res.status(200).json({
      success: true,
      ...account,
    });
  } catch (error) {
    console.error(
      "Account status error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};