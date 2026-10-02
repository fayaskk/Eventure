import express from "express";
import passport from "passport";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
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

router.post("/signup", signup);

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

router.post("/verify-otp", verifyOTP);

router.post("/resend-otp", resendOTP);

router.post("/login", userLogin);

router.post("/forgot-password", forgotPassword);

router.post("/forgot-password/verify-otp", verifyForgotPasswordOTP);

router.post("/reset-password", resetPassword);
router.get("/status", authMiddleware,(req, res) => {
    return res.status(200).json({
      success: true,
      message: "Account is active",
    });
  }
);
export default router;
