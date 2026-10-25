import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
  {
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    eventName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },

    banner: {
      type: String,
      required: true,
    },
    promoVideo: {
      type: String,
      default: null,
    },

    location: {
      venue: {
        type: String,
        required: true,
        trim: true,
      },

      address: {
        type: String,
        required: true,
        trim: true,
      },

      city: {
        type: String,
        required: true,
        trim: true,
      },

      state: {
        type: String,
        required: true,
        trim: true,
      },

      pincode: {
        type: String,
        required: true,
        trim: true,
      },
    },

    eventDate: {
      type: Date,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },

    endTime: {
      type: String,
      required: true,
    },

    tickets: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },

        price: {
          type: Number,
          required: true,
          min: 0.01,
        },

        quantity: {
          type: Number,
          required: true,
          min: 1,
        },

        reserved: {
          type: Number,
          default: 0,
          min: 0,
        },

        sold: {
          type: Number,
          default: 0,
          min: 0,
        },
      },
    ],

    bookingPolicy: {
      allowAfterStart: {
        type: Boolean,
        default: false,
      },
    },

    status: {
      type: String,
      enum: [
        "draft",
        "pending",
        "approved",
        "rejected",
        "cancelled",
        "completed",
      ],
      default: "draft",
    },

    isVisible: {
      type: Boolean,
      default: false,
    },

    isFeatured: {
      type: Boolean,
      default: false,
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    editRequestStatus: {
      type: String,
      enum: ["none", "pending", "rejected", "editing", "review"],
      default: "none",
    },
    editRequestRejectionReason: {
      type: String,
      trim: true,
    },
    editReviewRejectionReason: {
      type: String,
      trim: true,
    },
    pendingEdit: {
      eventName: String,
      description: String,
      category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
      },
      banner: String,
      promoVideo: String,
      location: {
        venue: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
      },
      eventDate: Date,
      startTime: String,
      endTime: String,

      tickets: [
        {
          _id: {
            type: mongoose.Schema.Types.ObjectId,
            required: false,
          },
          name: String,
          price: Number,
          quantity: Number,
          reserved: Number,
          sold: Number,
        },
      ],

      bookingPolicy: {
        allowAfterStart: Boolean,
      },
    },
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  },
);

export const Event = mongoose.model("Event", eventSchema);
