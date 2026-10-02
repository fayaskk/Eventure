import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";

import { generateAndStoreOTP, verifyOTPCode } from "./otp.service.js";

export const adminGetProfileService = async (adminId) => {
  const admin = await User.findById(adminId);

  if (!admin) {
    const error = new Error("Admin Not Found");
    error.statusCode = 404;
    throw error;
  }

  if (admin.role !== "admin") {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  return {
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
  };
};

export const adminUpdateProfileService = async (adminId, name) => {
  const normalizedName = name.trim();

  if (!normalizedName) {
    const error = new Error("Name should not be empty");
    error.statusCode = 400;
    throw error;
  }

  const admin = await User.findById(adminId);

  if (!admin) {
    const error = new Error("Admin not found");
    error.statusCode = 404;
    throw error;
  }

  if (admin.role !== "admin") {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  admin.name = normalizedName;

  await admin.save();
};


export const adminChangePasswordService = async (
  adminId,
  currentPassword,
  newPassword,
) => {
  const admin = await User.findById(adminId);

  if (!admin) {
    const error = new Error("Admin not found");
    error.statusCode = 404;
    throw error;
  }

  if (admin.role !== "admin") {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  const isPasswordCorrect = await bcrypt.compare(
    currentPassword,
    admin.password,
  );

  if (!isPasswordCorrect) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  admin.password = hashedPassword;

  await admin.save();
};

export const adminRequestEmailChangeService = async (adminId, newEmail) => {
  const normalizedEmail = newEmail.trim().toLowerCase();

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

  if (!emailRegex.test(normalizedEmail)) {
    const error = new Error("Invalid email format");
    error.statusCode = 400;
    throw error;
  }

  const emailExist = await User.findOne({
    email: normalizedEmail,
  });

  if (emailExist) {
    const error = new Error("Email Already Exist");
    error.statusCode = 409;
    throw error;
  }

  const admin = await User.findById(adminId);

  if (!admin) {
    const error = new Error("Admin not found");
    error.statusCode = 404;
    throw error;
  }

  if (admin.role !== "admin") {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  if (admin.email === normalizedEmail) {
    const error = new Error(
      "New email must be different from your current email",
    );
    error.statusCode = 400;
    throw error;
  }

  const otp = await generateAndStoreOTP(normalizedEmail);

  console.log(`OTP for ${normalizedEmail}: ${otp}`);
};

export const adminVerifyEmailChangeService = async (adminId, newEmail, otp) => {
  const normalizedEmail = newEmail.trim().toLowerCase();

  const normalizedOTP = otp.trim();

  const verify = await verifyOTPCode(normalizedEmail, normalizedOTP);

  if (!verify.success) {
    const error = new Error(verify.message);
    error.statusCode = 400;
    throw error;
  }

  const admin = await User.findById(adminId);

  if (!admin) {
    const error = new Error("Admin doesn't exist");
    error.statusCode = 404;
    throw error;
  }

  if (admin.role !== "admin") {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  const emailAlreadyExists = await User.findOne({
    email: normalizedEmail,
    _id: {
      $ne: adminId,
    },
  });

  if (emailAlreadyExists) {
    const error = new Error("This email is already in use");
    error.statusCode = 409;
    throw error;
  }

  admin.email = normalizedEmail;

  await admin.save();
};
