import mongoose from "mongoose";
import { Event } from "../models/event.model.js";
import { Ticket } from "../models/ticket.model.js";
import { Feedback } from "../models/feedback.model.js";

export const getUserAttendedEventsService = async (userId) => {
  const tickets = await Ticket.find({
    owner: userId,
    status: "valid",
    attendanceStatus: "checked_in",
  }).populate(
    "event",
    "eventName banner eventDate startTime endTime location status",
  );

  if (tickets.length === 0) {
    return [];
  }

  const completedTickets = tickets.filter((ticket) => {
    return ticket.event && ticket.event.status === "completed";
  });

  const uniqueEvents = new Map();

  completedTickets.forEach((ticket) => {
    const eventId = ticket.event._id.toString();

    if (!uniqueEvents.has(eventId)) {
      uniqueEvents.set(eventId, ticket.event);
    }
  });

  const finalArray = Array.from(uniqueEvents.values());

  if (finalArray.length === 0) {
    return [];
  }

  const eventIds = finalArray.map((event) => event._id);

  const feedbacks = await Feedback.find({
    user: userId,
    event: { $in: eventIds },
  }).lean();

  const feedbackMap = new Map(
    feedbacks.map((feedback) => [feedback.event.toString(), feedback]),
  );

  return finalArray.map((event) => ({
    ...event.toObject(),
    feedback: feedbackMap.get(event._id.toString()) || null,
  }));
};

export const submitFeedbackService = async (
  userId,
  eventId,
  { rating, comment },
) => {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(eventId)
  ) {
    const error = new Error("Invalid user or event ID");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const error = new Error(
      "Invalid rating. It must be an integer between 1 and 5.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (comment !== undefined && typeof comment !== "string") {
    const error = new Error("Comment must be a string");
    error.statusCode = 400;
    throw error;
  }

  if (typeof comment === "string" && comment.length > 1000) {
    const error = new Error("Comment cannot exceed 1000 characters");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    status: "completed",
  }).select("_id host");

  if (!event) {
    const error = new Error("Completed event not found");
    error.statusCode = 404;
    throw error;
  }
  if (event.host.toString() === userId.toString()) {
    const error = new Error("You cannot review your own event");
    error.statusCode = 403;
    throw error;
  }

  const attendedTicket = await Ticket.findOne({
    owner: userId,
    event: eventId,
    status: "valid",
    attendanceStatus: "checked_in",
  }).select("_id");

  if (!attendedTicket) {
    const error = new Error(
      "You must attend this event before submitting feedback",
    );
    error.statusCode = 403;
    throw error;
  }

  const existingFeedback = await Feedback.findOne({
    user: userId,
    event: eventId,
  }).select("_id");

  if (existingFeedback) {
    const error = new Error(
      "You have already submitted feedback. Please edit your existing feedback.",
    );
    error.statusCode = 409;
    throw error;
  }

  try {
    return await Feedback.create({
      user: userId,
      event: eventId,
      rating,
      comment: comment?.trim() || "",
    });
  } catch (error) {
    if (error.code === 11000) {
      const duplicateError = new Error(
        "Feedback already exists for this event. Please edit it instead.",
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

export const updateFeedbackService = async (
  userId,
  eventId,
  { rating, comment },
) => {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(eventId)
  ) {
    const error = new Error("Invalid user or event ID");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    const error = new Error("Rating must be an integer between 1 and 5");
    error.statusCode = 400;
    throw error;
  }

  if (comment !== undefined && typeof comment !== "string") {
    const error = new Error("Comment must be a string");
    error.statusCode = 400;
    throw error;
  }

  if (typeof comment === "string" && comment.length > 1000) {
    const error = new Error("Comment cannot exceed 1000 characters");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    status: "completed",
  }).select("_id host");

  if (!event) {
    const error = new Error("Completed event not found");
    error.statusCode = 404;
    throw error;
  }
  if (event.host.toString() === userId.toString()) {
    const error = new Error("You cannot review your own event");
    error.statusCode = 403;
    throw error;
  }

  const attendedTicket = await Ticket.findOne({
    owner: userId,
    event: eventId,
    status: "valid",
    attendanceStatus: "checked_in",
  }).select("_id");

  if (!attendedTicket) {
    const error = new Error("You are not eligible to review this event");
    error.statusCode = 403;
    throw error;
  }

  const feedback = await Feedback.findOneAndUpdate(
    { user: userId, event: eventId },
    {
      $set: {
        rating,
        comment: comment?.trim() || "",
      },
    },
    {
      new: true,
      runValidators: true,
    },
  );

  if (!feedback) {
    const error = new Error("Feedback not found. Submit feedback first.");
    error.statusCode = 404;
    throw error;
  }

  return feedback;
};

export const getHostFeedbackSummaryService = async (hostId) => {
  const hostEvents = await Event.find({ host: hostId }).select("_id");

  const eventIds = hostEvents.map((event) => event._id);

  const summary = await Feedback.aggregate([
    {
      $match: {
        event: { $in: eventIds },
      },
    },
    {
      $group: {
        _id: null,
        totalReviews: { $sum: 1 },
        averageRating: { $avg: "$rating" },
        fiveStarReviews: {
          $sum: { $cond: [{ $eq: ["$rating", 5] }, 1, 0] },
        },
        fourStarReviews: {
          $sum: { $cond: [{ $eq: ["$rating", 4] }, 1, 0] },
        },
        threeStarReviews: {
          $sum: { $cond: [{ $eq: ["$rating", 3] }, 1, 0] },
        },
        twoStarReviews: {
          $sum: { $cond: [{ $eq: ["$rating", 2] }, 1, 0] },
        },
        oneStarReviews: {
          $sum: { $cond: [{ $eq: ["$rating", 1] }, 1, 0] },
        },
        reviewedEventIds: { $addToSet: "$event" },
      },
    },
    {
      $project: {
        _id: 0,
        totalReviews: 1,
        averageRating: { $round: ["$averageRating", 1] },
        fiveStarReviews: 1,
        fourStarReviews: 1,
        threeStarReviews: 1,
        twoStarReviews: 1,
        oneStarReviews: 1,
        eventsWithFeedback: { $size: "$reviewedEventIds" },
      },
    },
  ]);

  return (
    summary[0] || {
      totalReviews: 0,
      averageRating: 0,
      fiveStarReviews: 0,
      fourStarReviews: 0,
      threeStarReviews: 0,
      twoStarReviews: 0,
      oneStarReviews: 0,
      eventsWithFeedback: 0,
    }
  );
};

export const getHostFeedbackEventsService = async (hostId) => {
  const events = await Event.aggregate([
    {
      $match: {
        host: new mongoose.Types.ObjectId(hostId),
      },
    },
    {
      $lookup: {
        from: "feedbacks",
        localField: "_id",
        foreignField: "event",
        as: "feedbacks",
      },
    },
    {
      $addFields: {
        totalReviews: { $size: "$feedbacks" },
        averageRating: {
          $round: [{ $ifNull: [{ $avg: "$feedbacks.rating" }, 0] }, 1],
        },
      },
    },
    {
      $project: {
        eventName: 1,
        banner: 1,
        eventDate: 1,
        status: 1,
        totalReviews: 1,
        averageRating: 1,
      },
    },
    {
      $sort: {
        eventDate: -1,
      },
    },
  ]);

  return events;
};

export const getHostEventFeedbackService = async (
  hostId,
  eventId,
  page = 1,
  limit = 10,
) => {
  if (
    !mongoose.isValidObjectId(hostId) ||
    !mongoose.isValidObjectId(eventId)
  ) {
    const error = new Error("Invalid host ID or event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    host: hostId,
  }).select("_id eventName");

  if (!event) {
    const error = new Error("Event not found or access denied");
    error.statusCode = 404;
    throw error;
  }

  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(limit) || 10));
  const skip = (currentPage - 1) * pageSize;

  const [feedbacks, totalReviews] = await Promise.all([
    Feedback.find({ event: eventId })
      .populate("user", "name")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    Feedback.countDocuments({ event: eventId }),
  ]);

  return {
    event,
    feedbacks: feedbacks.map((feedback) => ({
      _id: feedback._id,
      rating: feedback.rating,
      comment: feedback.comment,
      createdAt: feedback.createdAt,
      reviewerName: feedback.user?.name || "Event attendee",
    })),
    pagination: {
      currentPage,
      pageSize,
      totalReviews,
      totalPages: Math.ceil(totalReviews / pageSize),
    },
  };
};