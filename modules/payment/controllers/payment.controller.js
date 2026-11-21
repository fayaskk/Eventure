import crypto from "crypto";

import {
  createRazorpayOrderService,
  verifyRazorpayPaymentService,
  handleRazorpayPaymentFailureService,
  initiateRazorpayRefundService,
  handleRazorpayRefundWebhookService,
  reconcileCapturedRazorpayPaymentService,
} from "../../../services/payment.service.js";

import { WebhookEvent } from "../../../models/webhook-event.model.js";

export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const result = await createRazorpayOrderService(
      req.user.userId,
      bookingId
    );

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
    const {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    } = req.body;

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
      req.body
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

export const handleRazorpayWebhook = async (req, res) => {
  let webhookEventRecord;
  let processingToken;

  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    const signature = req.headers["x-razorpay-signature"];

    if (!webhookSecret || !signature || !Buffer.isBuffer(req.body)) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook configuration or request.",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.body)
      .digest("hex");

    if (!/^[a-f0-9]{64}$/i.test(signature)) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature.",
      });
    }

    const expectedBuffer = Buffer.from(expectedSignature, "hex");
    const receivedBuffer = Buffer.from(signature, "hex");

    if (
      expectedBuffer.length !== receivedBuffer.length ||
      !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid webhook signature.",
      });
    }

    const payload = JSON.parse(req.body.toString("utf8"));

    const supportedEvents = [
      "refund.processed",
      "refund.failed",
      "payment.captured",
    ];

    if (!supportedEvents.includes(payload.event)) {
      return res.status(200).json({
        success: true,
        message: "Webhook event ignored.",
      });
    }

    const eventId = req.headers["x-razorpay-event-id"];

    if (
      !eventId ||
      typeof eventId !== "string" ||
      !eventId.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid webhook event ID.",
      });
    }

    processingToken = crypto.randomUUID();

    const processingStartedAt = new Date();
    const processingTimeout = 5 * 60 * 1000;
    const staleProcessingTime = new Date(
      Date.now() - processingTimeout
    );

    try {
      webhookEventRecord = await WebhookEvent.create({
        eventId,
        event: payload.event,
        status: "processing",
        attempts: 1,
        processingStartedAt,
        processingToken,
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      const existingEvent = await WebhookEvent.findOne({ eventId });

      if (!existingEvent) {
        throw error;
      }

      if (existingEvent.status === "processed") {
        return res.status(200).json({
          success: true,
          message: "Duplicate webhook event already processed.",
        });
      }

      if (existingEvent.status === "processing") {
        const processingAge =
          Date.now() -
          new Date(
            existingEvent.processingStartedAt ||
            existingEvent.updatedAt
          ).getTime();

        if (processingAge < processingTimeout) {
          return res.status(500).json({
            success: false,
            message: "Webhook event is currently being processed.",
          });
        }
      }

      webhookEventRecord = await WebhookEvent.findOneAndUpdate(
        {
          _id: existingEvent._id,
          $or: [
            {
              status: "failed",
            },
            {
              status: "processing",
              $or: [
                {
                  processingStartedAt: {
                    $lte: staleProcessingTime,
                  },
                },
                {
                  processingStartedAt: null,
                },
              ],
            },
          ],
        },
        {
          $set: {
            status: "processing",
            processingStartedAt,
            processingToken,
            lastError: null,
          },
          $inc: {
            attempts: 1,
          },
        },
        {
          new: true,
        }
      );

      if (!webhookEventRecord) {
        return res.status(500).json({
          success: false,
          message: "Webhook event could not be claimed for processing.",
        });
      }
    }

    let result;

    switch (payload.event) {
      case "payment.captured": {
        const paymentEntity = payload.payload?.payment?.entity;

        if (!paymentEntity?.id || !paymentEntity?.order_id) {
          throw new Error("Invalid payment.captured webhook payload.");
        }

        result = await reconcileCapturedRazorpayPaymentService({
          razorpayPaymentId: paymentEntity.id,
          razorpayOrderId: paymentEntity.order_id,
        });

        break;
      }

      case "refund.processed":
      case "refund.failed": {
        result = await handleRazorpayRefundWebhookService(payload);

        break;
      }

      default:
        throw new Error(`Unsupported webhook event: ${payload.event}`);
    }

    const updateResult = await WebhookEvent.updateOne(
      {
        _id: webhookEventRecord._id,
        status: "processing",
        processingToken,
      },
      {
        $set: {
          status: "processed",
          processedAt: new Date(),
          lastError: null,
          processingStartedAt: null,
          processingToken: null,
        },
      }
    );

    if (updateResult.modifiedCount !== 1) {
      throw new Error(
        "Webhook processing lease was lost before completion."
      );
    }

    return res.status(200).json({
      success: true,
      message: "Webhook event processed successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Razorpay webhook error:", error);

    if (webhookEventRecord && processingToken) {
      try {
        await WebhookEvent.updateOne(
          {
            _id: webhookEventRecord._id,
            status: "processing",
            processingToken,
          },
          {
            $set: {
              status: "failed",
              lastError: error.message,
              processingStartedAt: null,
              processingToken: null,
            },
          }
        );
      } catch (updateError) {
        console.error(
          "Failed to update webhook event status:",
          updateError
        );
      }
    }

    return res.status(500).json({
      success: false,
      message: "Webhook processing failed.",
    });
  }
};

export const testRefund = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const refund = await initiateRazorpayRefundService(
      ticketId,
      req.user.userId
    );

    return res.status(200).json({
      success: true,
      message: "Razorpay refund request submitted.",
      data: refund,
    });
  } catch (error) {
    console.error("Refund error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};