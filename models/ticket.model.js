import mongoose from "mongoose";

const ticketSchema = new mongoose.Schema(
  {
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    ticketTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    ticketName: {
      type: String,
      required: true,
      trim: true,
    },

    price: {
      type: Number,
      required: true,
      min: 0,
    },

    paidAmountPaise: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: function (value) {
          return value === null || Number.isSafeInteger(value);
        },
        message: "Paid amount must be a safe integer in paise.",
      },
    },

    platformFeePaise: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: function (value) {
          return value === null || Number.isSafeInteger(value);
        },
        message: "Platform fee must be a safe integer in paise.",
      },
    },

    hostEarningsPaise: {
      type: Number,
      default: null,
      min: 0,
      validate: {
        validator: function (value) {
          return value === null || Number.isSafeInteger(value);
        },
        message: "Host earnings must be a safe integer in paise.",
      },
    },

    ticketCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["valid", "cancelled", "refunded"],
      default: "valid",
      index: true,
    },

    attendanceStatus: {
      type: String,
      enum: ["not_checked_in", "checked_in"],
      default: "not_checked_in",
      index: true,
    },

    cancellationStatus: {
      type: String,
      enum: ["none", "pending", "cancelled"],
      default: "none",
      index: true,
    },

    cancellationPolicy: {
      window: {
        type: String,
        enum: ["more_than_3_days", "1_to_3_days"],
        default: null,
      },

      feePercent: {
        type: Number,
        enum: [0, 20],
        default: null,
      },
    },

    cancellationRequestedAt: {
      type: Date,
      default: null,
    },

    cancellationExpiresAt: {
      type: Date,
      default: null,
    },

    refundStatus: {
      type: String,
      enum: [
        "none",
        "pending",
        "processing",
        "processed",
        "successful",
        "failed",
        "requires_reconciliation",
      ],
      default: "none",
      index: true,
    },

    razorpayRefundId: {
      type: String,
      default: null,
      trim: true,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    checkedInAt: {
      type: Date,
      default: null,
    },

    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

ticketSchema.index({ event: 1, attendanceStatus: 1 });

export const Ticket = mongoose.model("Ticket", ticketSchema);