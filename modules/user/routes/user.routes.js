import express from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import {
  getProfile,
  updateProfile,
  changePassword,
  requestEmailChange,
  verifyEmailChangeOTP,
  getAccountStatus,
  getUserBookings,
  getUserTicket,
} from "../controllers/user.controller.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/profile", authorizeRole("user", "host"), getProfile);

router.patch("/profile", authorizeRole("user", "host"), updateProfile);

router.post("/change-password", authorizeRole("user", "host"), changePassword);

router.post("/change-email/request", authorizeRole("user", "host"), requestEmailChange);

router.post( "/change-email/verify", authorizeRole("user", "host"), verifyEmailChangeOTP);

router.get("/account-status", getAccountStatus);

router.get("/bookings", authorizeRole("user", "host"), getUserBookings);

router.get( "/bookings/:bookingId/ticket", authorizeRole("user", "host"), getUserTicket,);

export default router;
