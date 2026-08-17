import express from "express";
import { resendOTP, signup, userLogin, verifyOTP } from "../controllers/user.controller.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-otp",verifyOTP)
router.post("/resend-otp",resendOTP)
router.post("/login",userLogin)

export default router;