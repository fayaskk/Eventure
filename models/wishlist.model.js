import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

wishlistSchema.index(
  { user: 1, event: 1 },
  { unique: true }
);

wishlistSchema.index({ user: 1, createdAt: -1 });

export const Wishlist = mongoose.model("Wishlist", wishlistSchema);