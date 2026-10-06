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
      enum: ["created", "pending", "successful", "failed", "refunded"],
      default: "created",
    },

    failureReason: {
      type: String,
      trim: true,
    },

    refundAmount: {
      type: Number,
      min: 0,
    },

    refundedAt: {
      type: Date,
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
