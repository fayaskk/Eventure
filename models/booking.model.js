import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    tickets: [
      {
        ticketId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },

        ticketName: {
          type: String,
          required: true,
          trim: true,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
          validate: {
            validator: Number.isInteger,
            message: "Ticket quantity must be an integer",
          },
        },

        price: {
          type: Number,
          required: true,
          min: 0,
        },

        subtotal: {
          type: Number,
          required: true,
          min: 0,
        },
      },
    ],

    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    bookingReference: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
      index: true,
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "successful", "failed", "expired", "refunded"],
      default: "pending",
      index: true,
    },

    paymentExpiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

bookingSchema.index({ user: 1, created_at: -1 });

bookingSchema.index({
  bookingStatus: 1,
  paymentStatus: 1,
  paymentExpiresAt: 1,
});

export const Booking = mongoose.model("Booking", bookingSchema);
