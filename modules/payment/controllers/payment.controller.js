import {
  createRazorpayOrderService,
  verifyRazorpayPaymentService,
  handleRazorpayPaymentFailureService,
} from "../../../services/payment.service.js";

export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const result = await createRazorpayOrderService(req.user.userId, bookingId);

    return res.status(201).json({
      success: true,
      message: "Razorpay order created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    const result = await verifyRazorpayPaymentService(req.user.userId, {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyProcessed
        ? "Payment was already verified"
        : "Payment verified successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRazorpayPaymentFailure = async (req, res, next) => {
  try {
    const result = await handleRazorpayPaymentFailureService(
      req.user.userId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Payment failure recorded",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

import crypto from "crypto";

export const handleRazorpayWebhook = async (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!webhookSecret || !signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook configuration or request",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");

    if (
      !/^[a-f0-9]{64}$/i.test(signature) ||
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature",
      });
    }

    const payload = JSON.parse(req.body.toString("utf8"));

    if (!["payment.captured", "payment.failed"].includes(payload.event)) {
      return res.status(200).json({
        success: true,
        message: "Webhook event ignored",
      });
    }

    return res.status(501).json({
      success: false,
      message: "Verified webhook processing is not implemented yet",
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed",
    });
  }
};
