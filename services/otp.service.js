import { OTP } from "../models/otp.model.js";

export const generateAndStoreOTP = async (email) => {
  const otp = Math.floor(
    100000 + Math.random() * 900000
  ).toString();

  const expiresAt = new Date(
    Date.now() + 5 * 60 * 1000
  );

 
  await OTP.findOneAndDelete({ email });

  
  await OTP.create({
    email,
    otp,
    expiresAt,
    attempts: 0,
  });

  return otp;
};

export const verifyOTPCode = async (
  email,
  otp
) => {
  const otpRecord =
    await OTP.findOne({ email });

  if (!otpRecord) {
    return {
      success: false,
      message:
        "OTP not found or expired",
    };
  }


  if (
    otpRecord.expiresAt < new Date()
  ) {
    await OTP.deleteOne({
      email,
    });

    return {
      success: false,
      message: "OTP has expired",
    };
  }


  if (otpRecord.attempts >= 3) {
    await OTP.deleteOne({
      email,
    });

    return {
      success: false,
      message:
        "Too many incorrect attempts. Please request a new OTP.",
    };
  }

  
  if (otpRecord.otp !== otp) {
    otpRecord.attempts += 1;

    await otpRecord.save();

    return {
      success: false,
      message: "Invalid OTP",
    };
  }

  
  await OTP.deleteOne({
    email,
  });

  return {
    success: true,
    message:
      "OTP verified successfully",
  };
};