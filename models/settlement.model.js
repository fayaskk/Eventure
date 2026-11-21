import mongoose from "mongoose";

const isValidPaise = (value) => {
  return Number.isSafeInteger(value) && value >= 0;
};

const settlementPaymentSchema = new mongoose.Schema(
  {
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isValidPaise,
        message: "Settlement payment amount must be a valid integer in paise",
      },
    },
  },
  {
    _id: false,
  },
);

const settlementSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    payments: {
      type: [settlementPaymentSchema],
      required: true,
      validate: [
        {
          validator: (payments) => payments.length > 0,
          message: "A settlement must contain at least one payment",
        },
        {
          validator: (payments) => {
            const paymentIds = payments.map((item) =>
              item.payment.toString(),
            );

            return new Set(paymentIds).size === paymentIds.length;
          },
          message: "A payment cannot appear more than once in a settlement",
        },
      ],
    },

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: isValidPaise,
        message: "Settlement total must be a valid integer in paise",
      },
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "paid"],
      default: "pending",
    },

    paymentReference: {
      type: String,
      trim: true,
      default: null,
    },

    adminNote: {
      type: String,
      trim: true,
      default: null,
    },

    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    processedAt: {
      type: Date,
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

// Ensure the settlement total equals the sum of its payment amounts.
settlementSchema.pre("validate", function () {
  if (!Array.isArray(this.payments) || !this.payments.length) {
    return;
  }

  const calculatedTotal = this.payments.reduce(
    (total, item) => total + item.amount,
    0,
  );

  if (!Number.isSafeInteger(calculatedTotal)) {
    this.invalidate(
      "totalAmount",
      "Settlement payment total exceeds the safe integer limit",
    );

    return;
  }

  if (calculatedTotal !== this.totalAmount) {
    this.invalidate(
      "totalAmount",
      "Settlement total must equal the sum of individual payment amounts",
    );
  }
});

settlementSchema.index({ host: 1, created_at: -1 });
settlementSchema.index({ event: 1, status: 1 });
settlementSchema.index({ status: 1, created_at: -1 });

export const Settlement = mongoose.model(
  "Settlement",
  settlementSchema,
);