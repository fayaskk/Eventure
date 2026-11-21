import mongoose from "mongoose";
import { Wishlist } from "../models/wishlist.model.js";
import { Event } from "../models/event.model.js";

export const addToWishlistService = async (userId, eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    status: "approved",
    isVisible: true,
  });

  if (!event) {
    const error = new Error("Event is unavailable or not approved");
    error.statusCode = 404;
    throw error;
  }

  try {
    const wishlistItem = await Wishlist.create({
      user: userId,
      event: eventId,
    });

    return wishlistItem;
  } catch (error) {
    if (error.code === 11000) {
      const duplicateError = new Error(
        "Event is already in your wishlist"
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

export const removeFromWishlistService = async (userId, eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const wishlistItem = await Wishlist.findOneAndDelete({
    user: userId,
    event: eventId,
  });

  if (!wishlistItem) {
    const error = new Error("Event not found in your wishlist");
    error.statusCode = 404;
    throw error;
  }

  return wishlistItem;
};

export const getWishlistService = async (userId) => {
  const wishlist = await Wishlist.find({
    user: userId,
  })
    .populate({
      path: "event",
      select:
        "eventName banner eventDate startTime endTime location status isVisible category",
      populate: {
        path: "category",
        select: "name",
      },
    })
    .sort({ createdAt: -1 })
    .lean();

  return wishlist.filter((item) => item.event !== null);
};
