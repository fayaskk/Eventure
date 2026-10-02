import express from "express";

import { authMiddleware } from "../../../middleware/auth.middleware.js";

import {
  getProfile,
  updateProfile,
  changePassword,
  requestEmailChange,
  verifyEmailChangeOTP,
  getAccountStatus
} from "../controllers/user.controller.js";


const router = express.Router();

router.get("/profile", authMiddleware, getProfile);

router.patch("/profile", authMiddleware, updateProfile);

router.post("/change-password", authMiddleware, changePassword);

router.post( "/change-email/request", authMiddleware, requestEmailChange);

router.post( "/change-email/verify",  authMiddleware, verifyEmailChangeOTP,);
router.get("/account-status",authMiddleware, getAccountStatus)

export default router;