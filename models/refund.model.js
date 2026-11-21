import mongoose from "mongoose";

const isValidPaise = (value) =>
  Number.isSafeInteger(value) && value >= 0;

const refundSchema = new mongoose.Schema(
  {
    ticket: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Ticket",
      required: true,
      index: true,
    },

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Booking",
      required: true,
      index: true,
    },

    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
      index: true,
    },

    razorpayRefundId: {
      type: String,
      default: null,
      trim: true,
    },

    paidAmountPaise: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: (value) =>
          Number.isSafeInteger(value) && value > 0,
        message: "Paid amount must be a positive safe integer in paise",
      },
    },

    cancellationFeePercent: {
      type: Number,
      required: true,
      enum: [0, 20],
    },

    cancellationFeePaise: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isValidPaise,
        message: "Cancellation fee must be a valid integer in paise",
      },
    },

    amount: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: (value) =>
          Number.isSafeInteger(value) && value > 0,
        message: "Refund amount must be a positive safe integer in paise",
      },
    },

    policyWindow: {
      type: String,
      required: true,
      enum: ["more_than_3_days", "1_to_3_days"],
    },

    status: {
      type: String,
      enum: [
        "pending",
        "processing",
        "successful",
        "failed",
        "requires_reconciliation",
      ],
      default: "pending",
    },

    reason: {
      type: String,
      default: "User requested ticket cancellation",
      trim: true,
    },

    cancellationRequestedAt: {
      type: Date,
      required: true,
    },

    initiatedAt: {
      type: Date,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },

    failureReason: {
      type: String,
      default: null,
      trim: true,
    },

    providerStatus: {
      type: String,
      default: null,
      trim: true,
    },

    initiationStartedAt: {
      type: Date,
      default: null,
    },

    initiationToken: {
      type: String,
      default: null,
    },

    reconciliationStartedAt: {
      type: Date,
      default: null,
    },

    reconciliationToken: {
      type: String,
      default: null,
    },

    reconciliationAttempts: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isSafeInteger,
        message: "Reconciliation attempts must be a safe integer",
      },
    },

    lastReconciliationAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

refundSchema.pre("validate", function () {
  if (
    !Number.isSafeInteger(this.paidAmountPaise) ||
    !Number.isSafeInteger(this.cancellationFeePaise) ||
    !Number.isSafeInteger(this.amount)
  ) {
    return;
  }

  if (this.cancellationFeePaise > this.paidAmountPaise) {
    this.invalidate(
      "cancellationFeePaise",
      "Cancellation fee cannot exceed the paid amount",
    );

    return;
  }

  const calculatedRefund =
    this.paidAmountPaise - this.cancellationFeePaise;

  if (calculatedRefund !== this.amount) {
    this.invalidate(
      "amount",
      "Refund amount must equal paid amount minus cancellation fee",
    );
  }

  const expectedFee = Math.round(
    (this.paidAmountPaise * this.cancellationFeePercent) / 100,
  );

  if (expectedFee !== this.cancellationFeePaise) {
    this.invalidate(
      "cancellationFeePaise",
      "Cancellation fee does not match the cancellation fee percentage",
    );
  }

  const expectedPolicyPercent = {
    more_than_3_days: 0,
    "1_to_3_days": 20,
  };

  if (
    expectedPolicyPercent[this.policyWindow] !==
    this.cancellationFeePercent
  ) {
    this.invalidate(
      "cancellationFeePercent",
      "Cancellation fee percentage does not match the policy window",
    );
  }
});

refundSchema.index(
  { razorpayRefundId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      razorpayRefundId: { $type: "string" },
    },
  },
);

refundSchema.index({ ticket: 1, createdAt: -1 });

refundSchema.index({ booking: 1, status: 1 });

refundSchema.index({ payment: 1, status: 1 });

refundSchema.index({
  status: 1,
  updatedAt: 1,
  reconciliationStartedAt: 1,
  initiationStartedAt: 1,
});

export const Refund = mongoose.model("Refund", refundSchema);