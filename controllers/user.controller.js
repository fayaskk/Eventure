import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import { generateAndStoreOTP } from "../services/otp.service.js";
import { OTP } from "../models/otp.model.js";

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
      return res.status(409).json({
        success: false,
        message: "Email already exists",
      });
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

    const storeOtp = await generateAndStoreOTP(normalizedEmail);

    console.log(`OTP for ${normalizedEmail}: ${storeOtp}`);

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




export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!otp || !email) {
      return res.status(400).json({
        success: false,
        message: " email and otp are required",
      });
    }
    let normalizedOTP = otp.trim()
    let find = await OTP.findOne({ email: email });
    if (!find) {
      return res.status(404).json({
        success: false,
        message: "OTP Not Found",
      });
    }
    let current = new Date();
    let experyTime = find.expiresAt;
    if (experyTime < current) {
      return res.status(404).json({
        success: false,
        message: "OTP expired,Request for new OTP",
      });
    } else if (find.attempts >= 3) {
      return res.status(409).json({
        success: false,
        message: "Too Many Attempts",
      });
    } else {
      find.attempts++;
      await find.save();
    }

  console.log("DB OTP:", find.otp);
console.log("DB OTP type:", typeof find.otp);

console.log("Request OTP:", normalizedOTP);
console.log("Request OTP type:", typeof normalizedOTP);

console.log("Are they equal:", find.otp === normalizedOTP);

if (find.otp !== normalizedOTP) {
      
      return res.status(404).json({
        success: false,
        message: "Entered OTP is not correct",
      });
    }
    let verifyUser = await User.findOne({ email });
    verifyUser.isVerified = true;
    await verifyUser.save();
    let deleteOtp = await OTP.findOneAndDelete({ email });
    res.status(200).json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("OTP-Verify error:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
