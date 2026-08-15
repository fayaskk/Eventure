import { OTP } from "../models/otp.model.js";

export async function generateAndStoreOTP(email) {
    const otpGen = Math.floor(Math.random() * 1000000)
        .toString()
        .padStart(6, "0");

   
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

   
    await OTP.findOneAndDelete({ email });

  
    await OTP.create({
        email,
        otp: otpGen,
        expiresAt,
        attempts: 0
    });

    return otpGen;
}