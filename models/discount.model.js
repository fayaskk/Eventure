import mongoose from "mongoose";

const { Schema, model } = mongoose;

const discountSchema = new Schema(
  {
    host: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    event: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 30,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 300,
      default: "",
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0.01,
    },

    maxDiscount: {
      type: Number,
      min: 0.01,
      default: null,
    },

    minBookingAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
    },

    usageLimit: {
      type: Number,
      min: 1,
      default: null,
    },

    usedCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    reservedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    perUserLimit: {
      type: Number,
      min: 1,
      default: 1,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
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

discountSchema.index({ event: 1, code: 1 }, { unique: true });

discountSchema.index({
  host: 1,
  event: 1,
  status: 1,
});

discountSchema.index({
  event: 1,
  status: 1,
  startDate: 1,
  endDate: 1,
});

discountSchema.pre("validate", function () {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate(
      "endDate",
      "Discount end date must be later than start date.",
    );
  }

  if (this.discountType === "percentage" && this.discountValue > 100) {
    this.invalidate("discountValue", "Percentage discount cannot exceed 100%.");
  }

  if (this.discountType === "fixed" && this.maxDiscount !== null) {
    this.invalidate(
      "maxDiscount",
      "Maximum discount cap is only applicable to percentage discounts.",
    );
  }
});

export const Discount = model("Discount", discountSchema);
