import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    event: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "processed", "failed"],
      default: "processing",
      index: true,
    },
    attempts: {
      type: Number,
      default: 1,
    },
    lastError: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    processingStartedAt: {
      type: Date,
      default: null,
    },
    processingToken: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

export const WebhookEvent = mongoose.model(
  "WebhookEvent",
  webhookEventSchema,
);