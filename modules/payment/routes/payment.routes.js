import express from "express";

import {
  createRazorpayOrder,
  handleRazorpayPaymentFailure,
  verifyRazorpayPayment,
  testRefund,
} from "../controllers/payment.controller.js";

import { authorizeRole } from "../../../middleware/role.middleware.js";
import { authMiddleware } from "../../../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRole("user"));

router.post("/:bookingId/order", createRazorpayOrder);

router.post("/verify", verifyRazorpayPayment);

router.post("/failure", handleRazorpayPaymentFailure);

router.post("/:ticketId/refund", testRefund);

export default router;
