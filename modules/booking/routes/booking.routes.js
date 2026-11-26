import express from "express";
import {
  createBooking,
  requestTicketCancellation,
  withdrawTicketCancellation,
  validateCoupon,
  checkCouponAvailability
} from "../controllers/booking.controller.js";

import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRole("user", "host"));

router.post("/", createBooking);

router.post("/validate-coupon", validateCoupon);

router.post("/tickets/:ticketId/cancel", requestTicketCancellation,);

router.post("/tickets/:ticketId/cancel/withdraw", withdrawTicketCancellation,);

router.get("/:eventId/coupon-availability", checkCouponAvailability);

export default router;