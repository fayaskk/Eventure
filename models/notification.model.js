import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    recipientRole: {
      type: String,
      enum: ["user", "host", "admin"],
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    type: {
      type: String,
      enum: [
        "booking",
        "payment",
        "refund",
        "event",
        "event_update",
        "event_cancellation",
        "host_application",
        "review",
        "settlement",
        "system",
      ],
      required: true,
    },

    relatedEntity: {
      entityType: {
        type: String,
        enum: ["Booking", "Event", "Ticket", "Payment", "Settlement", "User"],
      },

      entityId: {
        type: mongoose.Schema.Types.ObjectId,
      },
    },

    actionUrl: {
      type: String,
      trim: true,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    isRead: {
      type: Boolean,
      default: false,
    },

    readAt: {
      type: Date,
      default: null,
    },

    idempotencyKey: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

notificationSchema.index({
  recipient: 1,
  created_at: -1,
});

notificationSchema.index({
  recipient: 1,
  isRead: 1,
  created_at: -1,
});

export const Notification = mongoose.model(
  "Notification",
  notificationSchema,
);