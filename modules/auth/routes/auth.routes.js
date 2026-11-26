import express from "express";
import passport from "passport";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import rateLimit from "../../../middleware/rateLimit.middleware.js";
import {
  signup,
  verifyOTP,
  resendOTP,
  userLogin,
  forgotPassword,
  verifyForgotPasswordOTP,
  resetPassword,
  googleCallback,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/signup", rateLimit, signup);

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    session: false,
  }),
  googleCallback,
);

router.post("/verify-otp", rateLimit, verifyOTP);

router.post("/resend-otp", rateLimit, resendOTP);

router.post("/login", rateLimit, userLogin);

router.post("/forgot-password", rateLimit, forgotPassword);

router.post("/forgot-password/verify-otp", rateLimit, verifyForgotPasswordOTP);

router.post("/reset-password", rateLimit, resetPassword);
router.get("/status", authMiddleware,(req, res) => {
    return res.status(200).json({
      success: true,
      message: "Account is active",
    });
  }
);
export default router;
