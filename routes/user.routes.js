import express from "express";
import { resendOTP, signup, verifyOTP } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-otp",verifyOTP)
router.post("/resend-otp",resendOTP)

export default router;