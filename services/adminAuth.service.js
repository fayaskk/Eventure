import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";

import {
  generateToken,
  generatePasswordResetToken,
  verifyPasswordResetToken,
} from "../utils/jwt.js";

import {
  generateAndStoreOTP,
  verifyOTPCode,
} from "./otp.service.js";

export const adminLoginService = async (
  email,
  password,
) => {
  const normalizedEmail =
    email.trim().toLowerCase();

  const emailRegex =
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!emailRegex.test(normalizedEmail)) {
    const error = new Error(
      "Invalid email format",
    );
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({
    email: normalizedEmail,
  });

  if (!user) {
    const error = new Error(
      "Invalid email or password",
    );
    error.statusCode = 401;
    throw error;
  }

  if (user.role !== "admin") {
    const error = new Error(
      "Admin access required",
    );
    error.statusCode = 403;
    throw error;
  }

  if (user.isBlocked) {
    const error = new Error(
      "Admin account is blocked",
    );
    error.statusCode = 403;
    throw error;
  }

  if (!user.isVerified) {
    const error = new Error(
      "Admin account is not verified",
    );
    error.statusCode = 403;
    throw error;
  }

  const isPasswordCorrect =
    await bcrypt.compare(
      password,
      user.password,
    );

  if (!isPasswordCorrect) {
    const error = new Error(
      "Invalid email or password",
    );
    error.statusCode = 401;
    throw error;
  }

  return {
    token: generateToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
};

export const adminForgotPasswordService =
  async (email) => {
    const normalizedEmail =
      email.trim().toLowerCase();

    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(normalizedEmail)) {
      const error = new Error(
        "Invalid email format",
      );
      error.statusCode = 400;
      throw error;
    }

    const admin = await User.findOne({
      email: normalizedEmail,
      role: "admin",
    });

    if (!admin) {
      const error = new Error(
        "Admin not found",
      );
      error.statusCode = 404;
      throw error;
    }

    const otp =
      await generateAndStoreOTP(
        normalizedEmail,
      );

    console.log(
      `OTP for ${normalizedEmail}: ${otp}`,
    );
  };

export const adminVerifyForgotPasswordOTPService =
  async (email, otp) => {
    const normalizedEmail =
      email.trim().toLowerCase();

    if (typeof otp !== "string") {
      const error = new Error(
        "Invalid OTP format",
      );
      error.statusCode = 400;
      throw error;
    }

    const normalizedOTP =
      otp.trim();

    const result =
      await verifyOTPCode(
        normalizedEmail,
        normalizedOTP,
      );

    if (!result.success) {
      const error = new Error(
        result.message,
      );
      error.statusCode = 400;
      throw error;
    }

    const admin = await User.findOne({
      email: normalizedEmail,
      role: "admin",
    });

    if (!admin) {
      const error = new Error(
        "Admin not found",
      );
      error.statusCode = 404;
      throw error;
    }

    return generatePasswordResetToken(
      admin,
    );
  };

export const adminResetPasswordService =
  async (
    resetToken,
    newPassword,
  ) => {
    const result =
      verifyPasswordResetToken(
        resetToken,
      );

    if (!result.success) {
      const error = new Error(
        result.message,
      );
      error.statusCode = 401;
      throw error;
    }

    const decoded =
      result.decoded;

    if (
      decoded.purpose !==
        "password-reset" ||
      decoded.role !== "admin"
    ) {
      const error = new Error(
        "Invalid reset token",
      );
      error.statusCode = 401;
      throw error;
    }

    const admin =
      await User.findById(
        decoded.userId,
      );

    if (!admin) {
      const error = new Error(
        "Admin not found",
      );
      error.statusCode = 404;
      throw error;
    }

    if (admin.role !== "admin") {
      const error = new Error(
        "Unauthorized",
      );
      error.statusCode = 403;
      throw error;
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10,
      );

    admin.password =
      hashedPassword;

    await admin.save();
  };