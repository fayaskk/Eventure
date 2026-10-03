import mongoose from "mongoose";
import { Category } from "../models/category.model.js";
import { Event } from "../models/event.model.js";


export const getPublicEventsService = async (
  search,
  slug,
  page,
  limit,
  sort,
) => {
  const filter = {
    status: "approved",
    isVisible: true,
  };

  if (search) {
    filter.$or = [
      {
        eventName: {
          $regex: search,
          $options: "i",
        },
      },
      {
        description: {
          $regex: search,
          $options: "i",
        },
      },
      {
        "location.venue": {
          $regex: search,
          $options: "i",
        },
      },
      {
        "location.city": {
          $regex: search,
          $options: "i",
        },
      },
      {
        "location.state": {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }
  console.log("slug:", slug);
  if (slug) {
    const normalizedSlug = slug.trim().toLowerCase();
    console.log("normalizedSlug:", normalizedSlug);
    const category = await Category.findOne({
      slug: normalizedSlug,
      isActive: true,
    });

    if (!category) {
      const error = new Error("Category not found");
      error.statusCode = 404;
      throw error;
    }

    filter.category = category._id;
    console.log("category id:", category._id);
    console.log("final filter:", filter);
  }

  let sortQuery;

  switch (sort) {
    case "newest":
      sortQuery = {
        created_at: -1,
      };
      break;

    case "oldest":
      sortQuery = {
        created_at: 1,
      };
      break;

    default:
      sortQuery = {
        eventDate: 1,
      };
  }

  const skip = (page - 1) * limit;

  const events = await Event.find(filter)
    .populate("category", "name slug")
    .sort(sortQuery)
    .skip(skip)
    .limit(limit);

  const totalEvents = await Event.countDocuments(filter);

  const totalPages = Math.ceil(totalEvents / limit);

  return {
    events,
    pagination: {
      page,
      limit,
      totalEvents,
      totalPages,
    },
  };
};

export const getPublicEventByIdService = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    status: "approved",
    isVisible: true,
  }).populate("category", "name slug");

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  return event;
};

export const createEventService = async (hostId, eventData) => {
  const {
    eventName,
    description,
    category,
    banner,
    location,
    eventDate,
    startTime,
    endTime,
    tickets,
  } = eventData;

  const categoryExist = await Category.findOne({
    _id: category,
    isActive: true,
  });

  if (!categoryExist) {
    const error = new Error("Category does not exist or is inactive");
    error.statusCode = 400;
    throw error;
  }

  return await Event.create({
    host: hostId,
    eventName,
    description,
    category,
    banner,
    location,
    eventDate,
    startTime,
    endTime,
    tickets,
  });
};

export const getHostEventsService = async (hostId) => {
  return await Event.find({
    host: hostId,
  }).populate("category");
};

export const getHostEventByIdService = async (hostId, eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    host: hostId,
  }).populate("category");

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  return event;
};

export const updateHostEventService = async (hostId, eventId, eventData) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    host: hostId,
  });

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (!["draft", "rejected"].includes(event.status)) {
    const error = new Error("Only draft & rejected events can be edited");
    error.statusCode = 400;
    throw error;
  }

  const {
    eventName,
    description,
    category,
    banner,
    location,
    eventDate,
    startTime,
    endTime,
    tickets,
  } = eventData;

  const categoryExist = await Category.findOne({
    _id: category,
    isActive: true,
  });

  if (!categoryExist) {
    const error = new Error("Category does not exist or is inactive");
    error.statusCode = 400;
    throw error;
  }

  event.eventName = eventName;
  event.description = description;
  event.category = category;
  event.banner = banner;
  event.location = location;
  event.eventDate = eventDate;
  event.startTime = startTime;
  event.endTime = endTime;
  event.tickets = tickets;

  return await event.save();
};

export const submitHostEventService = async (hostId, eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    host: hostId,
  });

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "draft") {
    const error = new Error("Only draft events can be submitted for approval");
    error.statusCode = 400;
    throw error;
  }

  event.status = "pending";
  event.isVisible = false;

  return await event.save();
};

export const getPendingEventsService = async () => {
  return await Event.find({
    status: "pending",
  })
    .populate("host", "name email")
    .populate("category", "name slug");
};

export const getAdminEventByIdService = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
  })
    .populate("host", "name email")
    .populate("category", "name slug");

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  return event;
};

export const approveEventService = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
  })
    .populate("host", "name email")
    .populate("category", "name slug");

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "pending") {
    const error = new Error("Only pending events can be approved");
    error.statusCode = 400;
    throw error;
  }

  event.status = "approved";
  event.isVisible = true;

  await event.save();

  return event;
};

export const rejectEventService = async (eventId, rejectionReason) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  if (typeof rejectionReason !== "string" || !rejectionReason.trim()) {
    const error = new Error("Rejection reason is required");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
  })
    .populate("host", "name email")
    .populate("category", "name slug");

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "pending") {
    const error = new Error("Only pending events can be rejected");
    error.statusCode = 400;
    throw error;
  }

  event.status = "rejected";
  event.isVisible = false;
  event.rejectionReason = rejectionReason.trim();

  await event.save();

  return event;
};



export const hideEventService = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
  });

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  event.isVisible = false;

  await event.save();

  return event;
};