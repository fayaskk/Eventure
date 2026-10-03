import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: true,
      trim: true,
    },

    fileUrl: {
      type: String,
      required: true,
      trim: true,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const hostSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    organizationName: {
      type: String,
      required: true,
      trim: true,
    },

    organizationType: {
      type: String,
      required: true,
      trim: true,
    },

    website: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    contactDetails: {
      primaryContactName: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
      },

      phoneNumber: {
        type: String,
        required: true,
        trim: true,
      },

      officeAddress: {
        type: String,
        required: true,
        trim: true,
      },
    },

    verificationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },

    rejectionReason: {
      type: String,
      trim: true,
    },

    documents: {
      identityProof: {
        type: documentSchema,
        required: true,
      },

      organizationProof: {
        type: documentSchema,
        required: true,
      },

      addressProof: {
        type: documentSchema,
        required: true,
      },

      bankProof: {
        type: documentSchema,
        required: true,
      },
    },

    bankAccountName: {
      type: String,
      required: true,
      trim: true,
    },

    bankAccountNumber: {
      type: String,
      required: true,
      trim: true,
    },

    ifscCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    bankName: {
      type: String,
      required: true,
      trim: true,
    },
  },

  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at",
    },
  }
);

export const Host = mongoose.model("Host", hostSchema);