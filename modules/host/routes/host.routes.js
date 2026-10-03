import express from "express";

import {
  hostLogin,
  hostForgotPassword,
  hostVerifyForgotPasswordOTP,
  hostResetPassword,
  hostChangePassword,
  hostRequestEmailChange,
  hostVerifyEmailChangeOTP,
} from "../controllers/hostAuth.controller.js";

import {
  hostGetProfile,
  hostUpdateProfile,
} from "../controllers/hostProfile.controller.js";


import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";

const router = express.Router();



router.post("/login", hostLogin);

router.post("/forgot-password", hostForgotPassword);

router.post("/verify-forgot-password-otp", hostVerifyForgotPasswordOTP);

router.post("/reset-password", hostResetPassword);

router.get("/profile", authMiddleware, authorizeRole("host"), hostGetProfile);

router.patch(
  "/profile",
  authMiddleware,
  authorizeRole("host"),
  hostUpdateProfile,
);

router.patch(
  "/profile/change-password",
  authMiddleware,
  authorizeRole("host"),
  hostChangePassword,
);

router.post(
  "/profile/request-email-change",
  authMiddleware,
  authorizeRole("host"),
  hostRequestEmailChange,
);

router.patch(
  "/profile/verify-email-change",
  authMiddleware,
  authorizeRole("host"),
  hostVerifyEmailChangeOTP,
);

export default router;
