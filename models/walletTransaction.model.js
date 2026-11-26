import mongoose from "mongoose";

const walletTransactionSchema = new mongoose.Schema(
  {
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["credit", "debit"],
      required: true,
    },

    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },

    balanceAfterPaise: {
      type: Number,
      required: true,
      min: 0,
    },

    reason: {
      type: String,
      enum: [
        "refund",
        "booking",
        "admin_credit",
        "booking_cancellation",
        "other",
      ],
      required: true,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    referenceType: {
      type: String,
      enum: ["Booking", "Ticket", "Payment", "Refund", "Admin"],
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
    },

    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

walletTransactionSchema.index({
  wallet: 1,
  created_at: -1,
});

walletTransactionSchema.index({
  user: 1,
  created_at: -1,
});

walletTransactionSchema.index({
  referenceType: 1,
  referenceId: 1,
});

export const WalletTransaction = mongoose.model(
  "WalletTransaction",
  walletTransactionSchema,
);