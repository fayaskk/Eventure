import bcrypt from "bcrypt";
import { User } from "../models/user.model.js";
import { Host } from "../models/hostApplication.model.js";
import { generateAndStoreOTP, verifyOTPCode } from "./otp.service.js";
import mongoose from "mongoose";

export const getUserProfileService = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    language: user.language,
    referralCode: user.referralCode,
    created_at: user.created_at,
    isGoogleUser: user.isGoogleUser,
  };
};

export const updateUserProfileService = async (userId, name, language) => {
  const normalizedName = name.trim();

  if (normalizedName.length === 0) {
    const error = new Error("Name must not be empty");
    error.statusCode = 400;
    throw error;
  }

  const normalizedLanguage = language.trim();

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User Not Found");
    error.statusCode = 404;
    throw error;
  }

  user.language = normalizedLanguage;
  user.name = normalizedName;

  await user.save();

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    language: user.language,
  };
};

export const changeUserPasswordService = async (
  userId,
  currentPassword,
  newPassword,
) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.isGoogleUser) {
    const error = new Error(
      "Google accounts cannot change their password here. Please manage your password through Google.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!user.password) {
    const error = new Error("Your account does not have a password to change");
    error.statusCode = 400;
    throw error;
  }

  const isPasswordCorrect = await bcrypt.compare(
    currentPassword,
    user.password,
  );

  if (!isPasswordCorrect) {
    const error = new Error("Current password is incorrect");
    error.statusCode = 400;
    throw error;
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  user.password = hashedPassword;

  await user.save();
};

export const requestUserEmailChangeService = async (newEmail) => {
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

  const otp = await generateAndStoreOTP(normalizedEmail);

  console.log(`Request Email Change OTP for ${normalizedEmail} : ${otp}`);
};

export const verifyUserEmailChangeService = async (userId, newEmail, otp) => {
  const normalizedEmail = newEmail.trim().toLowerCase();

  const normalizedOTP = otp.trim();

  const verify = await verifyOTPCode(normalizedEmail, normalizedOTP);

  if (!verify.success) {
    const error = new Error(verify.message);
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User doesn't exist");
    error.statusCode = 404;
    throw error;
  }

  const emailAlreadyExists = await User.findOne({
    email: normalizedEmail,
    _id: { $ne: userId },
  });

  if (emailAlreadyExists) {
    const error = new Error("This email is already in use");
    error.statusCode = 409;
    throw error;
  }

  user.email = normalizedEmail;

  await user.save();
};

export const getUserAccountStatusService = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  const application = await Host.findOne({
    user: userId,
  });

  return {
    account: {
      role: user.role,
    },

    hostApplication: application
      ? {
          status: application.verificationStatus,
        }
      : null,
  };
};

export const getAllUsersService = async ({
  search = "",
  isBlocked,
  isVerified,
  page = 1,
  limit = 8,
}) => {
  const filter = {
    role: {
      $in: ["user", "host"],
    },
  };

  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    filter.$or = [
      {
        name: {
          $regex: normalizedSearch,
          $options: "i",
        },
      },
      {
        email: {
          $regex: normalizedSearch,
          $options: "i",
        },
      },
    ];
  }

  if (isBlocked === "true") {
    filter.isBlocked = true;
  }

  if (isBlocked === "false") {
    filter.isBlocked = false;
  }

  if (isVerified === "true") {
    filter.isVerified = true;
  }

  if (isVerified === "false") {
    filter.isVerified = false;
  }

  const currentPage = Math.max(Number(page) || 1, 1);
  const currentLimit = Math.max(Number(limit) || 8, 1);

  const skip = (currentPage - 1) * currentLimit;

  const users = await User.find(filter)
    .select("-password")
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(currentLimit);

  const totalUsers = await User.countDocuments(filter);

  const totalPages = Math.ceil(totalUsers / currentLimit);

  return {
    users,
    count: users.length,
    pagination: {
      page: currentPage,
      limit: currentLimit,
      totalUsers,
      totalPages,
    },
  };
};

export const getUserByIdService = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid user ID");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({
    _id: userId,
    role: {
      $in: ["user", "host"],
    },
  }).select("-password");

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  return user;
};

export const updateUserService = async (userId, userData) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid user ID");
    error.statusCode = 400;
    throw error;
  }

  const { name, email, language, isVerified } = userData;

  const user = await User.findOne({
    _id: userId,
    role: "user",
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (name !== undefined) {
    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      const error = new Error("Name must be at least 2 characters");
      error.statusCode = 400;
      throw error;
    }

    user.name = normalizedName;
  }

  if (email !== undefined) {
    const normalizedEmail = email.trim().toLowerCase();

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/;

    if (!emailRegex.test(normalizedEmail)) {
      const error = new Error("Invalid email format");
      error.statusCode = 400;
      throw error;
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
      _id: {
        $ne: userId,
      },
    });

    if (existingUser) {
      const error = new Error("Email is already in use");
      error.statusCode = 409;
      throw error;
    }

    user.email = normalizedEmail;
  }

  if (language !== undefined) {
    user.language = language;
  }

  if (isVerified !== undefined) {
    if (typeof isVerified === "boolean") {
      user.isVerified = isVerified;
    } else if (isVerified === "true") {
      user.isVerified = true;
    } else if (isVerified === "false") {
      user.isVerified = false;
    } else {
      const error = new Error("isVerified must be true or false");
      error.statusCode = 400;
      throw error;
    }
  }

  await user.save();

  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    language: user.language,
    isVerified: user.isVerified,
    isBlocked: user.isBlocked,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
};

export const blockAndUnblockUserService = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid user ID");
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findOne({
    _id: userId,
    role: {
      $in: ["user", "host"],
    },
  });

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  user.isBlocked = !user.isBlocked;

  await user.save();

  return {
    isBlocked: user.isBlocked,
    message: user.isBlocked
      ? "User blocked successfully"
      : "User unblocked successfully",
  };
};
