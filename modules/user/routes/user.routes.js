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
  getUserAttendedEvents,
  submitFeedback,updateFeedback,addToWishlist,
  removeFromWishlist,
  getWishlist,
} from "../controllers/user.controller.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";
import walletRoutes from "./wallet.routes.js"
import transactionRoutes from "./transaction.routes.js";

const router = express.Router();

router.use(authMiddleware);
router.get("/account-status", getAccountStatus);
router.use(authorizeRole("user", "host"))
router.get("/profile",  getProfile);
router.patch("/profile", updateProfile);
router.post("/change-password", changePassword);
router.post("/change-email/request", requestEmailChange);
router.post( "/change-email/verify", verifyEmailChangeOTP);
router.get("/bookings", getUserBookings);
router.get( "/bookings/:bookingId/ticket", getUserTicket,);
router.get("/attended-events", getUserAttendedEvents);
router.post("/events/:eventId/feedback", submitFeedback,);
router.patch("/events/:eventId/feedback",updateFeedback);
router.post("/wishlist/:eventId", addToWishlist);
router.delete("/wishlist/:eventId", removeFromWishlist);
router.get("/wishlist", getWishlist);
router.use("/wallet", walletRoutes);
router.use("/transactions", transactionRoutes);

export default router;
