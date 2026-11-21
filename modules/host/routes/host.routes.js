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
import { checkInTicket } from "../controllers/ticketCheckin.controller.js";
import { getHostFeedbackSummary ,getHostFeedbackEvents, getHostEventFeedback} from "../controllers/hostFeedback.controller.js";

import {
  hostGetProfile,
  hostUpdateProfile,
} from "../controllers/hostProfile.controller.js";


import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";

import {
  getHostBookingSummary,
  getHostBookings,
  getHostBookingDetails,
} from "../controllers/hostBooking.controller.js";

const router = express.Router();



router.post("/login", hostLogin);

router.post("/forgot-password", hostForgotPassword);

router.post("/verify-forgot-password-otp", hostVerifyForgotPasswordOTP);

router.post("/reset-password", hostResetPassword);

router.use(authMiddleware,authorizeRole("host"))

router.get("/profile", hostGetProfile);

router.patch("/profile", hostUpdateProfile,);

router.patch("/profile/change-password", hostChangePassword,);

router.post("/profile/request-email-change", hostRequestEmailChange,);

router.patch("/profile/verify-email-change", hostVerifyEmailChangeOTP,);

router.post("/tickets/check-in", checkInTicket,);

router.get("/feedback/summary", getHostFeedbackSummary,);

router.get("/feedback/events", getHostFeedbackEvents);

router.get("/feedback/events/:eventId", getHostEventFeedback);

router.get( "/bookings/summary", getHostBookingSummary);

router.get("/bookings", getHostBookings);

router.get("/bookings/:bookingId", getHostBookingDetails);

export default router;
