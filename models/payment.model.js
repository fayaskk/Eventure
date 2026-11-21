import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      unique: true,
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    razorpayPaymentId: {
      type: String,
      trim: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    currency: {
      type: String,
      required: true,
      default: "INR",
      uppercase: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "created",
        "pending",
        "successful",
        "failed",
        "expired",
        "refund_pending",
        "partially_refunded",
        "refunded",
        "refund_review",
        "refund_failed",
      ],
      default: "created",
      index: true,
    },

    failureReason: {
      type: String,
      trim: true,
    },

    totalRefundedPaise: {
      type: Number,
      min: 0,
      default: 0,
      validate: {
        validator: Number.isInteger,
        message: "Total refunded amount must be a whole number in paise.",
      },
    },

    refundAmount: {
      type: Number,
      min: 0,
    },

    razorpayRefundId: {
      type: String,
      trim: true,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    platformCommissionPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 10,
    },

    platformFee: {
      type: Number,
      min: 0,
      default: 0,
    },

    hostEarnings: {
      type: Number,
      min: 0,
      default: 0,
    },

    settlementStatus: {
      type: String,
      enum: ["available", "requested", "settled", "on_hold"],
      default: "available",
    },

    settlement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Settlement",
      default: null,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

export const Payment = mongoose.model("Payment", paymentSchema);