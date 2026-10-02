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

export const hostLoginService = async (
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

  if (user.role !== "host") {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  if (user.isBlocked) {
    const error = new Error(
      "Blocked by organization",
    );
    error.statusCode = 403;
    throw error;
  }

  if (!user.isVerified) {
    const error = new Error(
      "Email is not verified",
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

  return generateToken(user);
};

export const hostForgotPasswordService = async (
  email,
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
    role: "host",
  });

  if (!user) {
    const error = new Error(
      "Host not found",
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

export const hostVerifyForgotPasswordOTPService =
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

    const user = await User.findOne({
      email: normalizedEmail,
      role: "host",
    });

    if (!user) {
      const error = new Error(
        "Host not found",
      );
      error.statusCode = 404;
      throw error;
    }

    return generatePasswordResetToken(
      user,
    );
  };

export const hostResetPasswordService =
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
      "password-reset"
    ) {
      const error = new Error(
        "Invalid reset token",
      );
      error.statusCode = 401;
      throw error;
    }

    const user =
      await User.findById(
        decoded.userId,
      );

    if (!user) {
      const error = new Error(
        "User not found",
      );
      error.statusCode = 404;
      throw error;
    }

    if (user.role !== "host") {
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

    user.password =
      hashedPassword;

    await user.save();
  };

export const hostChangePasswordService =
  async (
    userId,
    currentPassword,
    newPassword,
  ) => {
    const host =
      await User.findById(
        userId,
      );

    if (!host) {
      const error = new Error(
        "User Not Found",
      );
      error.statusCode = 404;
      throw error;
    }

    if (host.role !== "host") {
      const error = new Error(
        "Unauthorized",
      );
      error.statusCode = 403;
      throw error;
    }

    const isPasswordCorrect =
      await bcrypt.compare(
        currentPassword,
        host.password,
      );

    if (!isPasswordCorrect) {
      const error = new Error(
        "Current password is incorrect",
      );
      error.statusCode = 400;
      throw error;
    }

    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        10,
      );

    host.password =
      hashedPassword;

    await host.save();
  };

export const hostRequestEmailChangeService =
  async (
    userId,
    newEmail,
  ) => {
    const normalizedEmail =
      newEmail.trim().toLowerCase();

    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(normalizedEmail)) {
      const error = new Error(
        "Invalid email format",
      );
      error.statusCode = 400;
      throw error;
    }

    const emailExist =
      await User.findOne({
        email: normalizedEmail,
      });

    if (emailExist) {
      const error = new Error(
        "Email Already Exist",
      );
      error.statusCode = 409;
      throw error;
    }

    const host =
      await User.findById(
        userId,
      );

    if (!host) {
      const error = new Error(
        "User not found",
      );
      error.statusCode = 404;
      throw error;
    }

    if (host.role !== "host") {
      const error = new Error(
        "Unauthorized",
      );
      error.statusCode = 403;
      throw error;
    }

    if (
      host.email ===
      normalizedEmail
    ) {
      const error = new Error(
        "New email must be different from your current email",
      );
      error.statusCode = 400;
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

export const hostVerifyEmailChangeOTPService =
  async (
    userId,
    newEmail,
    otp,
  ) => {
    const normalizedEmail =
      newEmail.trim().toLowerCase();

    const normalizedOTP =
      otp.trim();

    const verify =
      await verifyOTPCode(
        normalizedEmail,
        normalizedOTP,
      );

    if (!verify.success) {
      const error = new Error(
        verify.message,
      );
      error.statusCode = 400;
      throw error;
    }

    const host =
      await User.findById(
        userId,
      );

    if (!host) {
      const error = new Error(
        "Host doesn't exist",
      );
      error.statusCode = 404;
      throw error;
    }

    if (host.role !== "host") {
      const error = new Error(
        "Unauthorized",
      );
      error.statusCode = 403;
      throw error;
    }

    host.email =
      normalizedEmail;

    await host.save();
  };