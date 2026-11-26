import mongoose from "mongoose";
import sharp from "sharp";
import { v2 as cloudinary } from "cloudinary";
import process from "process";
import { Category } from "../models/category.model.js";
import { Event } from "../models/event.model.js";
import { Booking } from "../models/booking.model.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadEventBanner = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("Input file is missing");
  }

  const processedImage = await sharp(file.buffer)
    .resize({
      width: 1600,
      height: 900,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({
      quality: 85,
    })
    .toBuffer();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "eventure/events",
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result.secure_url);
      },
    );

    uploadStream.end(processedImage);
  });
};

const uploadPromoVideo = async (file) => {
  if (!file || !file.buffer) {
    throw new Error("Input file is missing");
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "eventure/videos",
        resource_type: "video",
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }

        resolve(result.secure_url);
      },
    );

    uploadStream.end(file.buffer);
  });
};

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

  if (slug) {
    const normalizedSlug = slug.trim().toLowerCase();

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
    bannerFile,
    promoVideoFile,
    location,
    eventDate,
    startTime,
    endTime,
    tickets,
    bookingPolicy,
    status,
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

  if (!bannerFile || !bannerFile.buffer) {
    const error = new Error("Event banner file is required.");
    error.statusCode = 400;
    throw error;
  }

  const bannerUrl = await uploadEventBanner(bannerFile);

  const promoVideoUrl = promoVideoFile
    ? await uploadPromoVideo(promoVideoFile)
    : null;

  const event = await Event.create({
    host: hostId,
    eventName,
    description,
    category,
    banner: bannerUrl,
    promoVideo: promoVideoUrl,
    location,
    eventDate,
    startTime,
    endTime,
    tickets,
    bookingPolicy,
    status,
    isVisible: false,
  });

  return event;
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

  const event = await Event.findOne({ _id: eventId, host: hostId });

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  const isDraftOrRejected = ["draft", "rejected"].includes(event.status);
  const isApprovedEdit =
    event.status === "approved" && event.editRequestStatus === "editing";

  if (!isDraftOrRejected && !isApprovedEdit) {
    const error = new Error(
      "This event cannot be edited in its current state.",
    );
    error.statusCode = 400;
    throw error;
  }

  const {
    eventName,
    description,
    category,
    location,
    eventDate,
    startTime,
    endTime,
    tickets,
    bookingPolicy,
    bannerFile,
    promoVideoFile,
  } = eventData;

  if (!mongoose.Types.ObjectId.isValid(category)) {
    const error = new Error("Invalid category ID");
    error.statusCode = 400;
    throw error;
  }

  const categoryExists = await Category.findOne({
    _id: category,
    isActive: true,
  });

  if (!categoryExists) {
    const error = new Error("Category does not exist or is inactive.");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(tickets) || tickets.length === 0) {
    const error = new Error("At least one ticket type is required.");
    error.statusCode = 400;
    throw error;
  }

  const existingTickets = isApprovedEdit ? event.tickets : event.tickets;

  const existingTicketMap = new Map(
    existingTickets.map((ticket) => [ticket._id.toString(), ticket]),
  );

  const submittedTicketIds = new Set();
  const updatedTickets = [];

  for (const ticket of tickets) {
    const { _id, name, price, quantity } = ticket;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0.01 ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1
    ) {
      const error = new Error("Invalid ticket details.");
      error.statusCode = 400;
      throw error;
    }

    if (_id) {
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        const error = new Error("Invalid ticket ID.");
        error.statusCode = 400;
        throw error;
      }

      const ticketId = _id.toString();

      if (submittedTicketIds.has(ticketId)) {
        const error = new Error("Duplicate ticket ID.");
        error.statusCode = 400;
        throw error;
      }

      submittedTicketIds.add(ticketId);

      const existingTicket = existingTicketMap.get(ticketId);

      if (!existingTicket) {
        const error = new Error(
          "A submitted ticket does not belong to this event.",
        );
        error.statusCode = 400;
        throw error;
      }

      const sold = existingTicket.sold ?? 0;
      const reserved = existingTicket.reserved ?? 0;
      const minimumQuantity = sold + reserved;

      if (Number(quantity) < minimumQuantity) {
        const error = new Error(
          `Ticket "${name}" cannot have a quantity below its sold and reserved count (${minimumQuantity}).`,
        );
        error.statusCode = 400;
        throw error;
      }

      updatedTickets.push({
        _id: existingTicket._id,
        name: name.trim(),
        price: Number(price),
        quantity: Number(quantity),
        sold,
        reserved,
      });
    } else {
      updatedTickets.push({
        name: name.trim(),
        price: Number(price),
        quantity: Number(quantity),
        sold: 0,
        reserved: 0,
      });
    }
  }

  for (const existingTicket of existingTickets) {
    const ticketId = existingTicket._id.toString();

    if (!submittedTicketIds.has(ticketId)) {
      if (
        (existingTicket.sold ?? 0) > 0 ||
        (existingTicket.reserved ?? 0) > 0
      ) {
        const error = new Error(
          `Ticket "${existingTicket.name}" cannot be removed because it has sold or reserved tickets.`,
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }

  let banner = isApprovedEdit
    ? event.pendingEdit?.banner || event.banner
    : event.banner;

  if (bannerFile) {
    banner = await uploadEventBanner(bannerFile);
  }

  const existingPromoVideo = isApprovedEdit
    ? (event.pendingEdit?.promoVideo ?? event.promoVideo ?? null)
    : (event.promoVideo ?? null);

  const promoVideo = promoVideoFile
    ? await uploadPromoVideo(promoVideoFile)
    : existingPromoVideo;

  const updateValues = {
    eventName,
    description,
    category,
    location,
    eventDate,
    startTime,
    endTime,
    tickets: updatedTickets,
    bookingPolicy,
    banner,
    promoVideo,
  };

  if (isDraftOrRejected) {
    Object.assign(event, updateValues);

    if (event.status === "rejected") {
      event.status = "draft";
      event.rejectionReason = undefined;
      event.isVisible = false;
    }
  }

  if (isApprovedEdit) {
    event.pendingEdit = updateValues;
    event.editRequestStatus = "review";
    event.editReviewRejectionReason = undefined;
    event.isVisible = false;
  }

  return await event.save();
};

export const approveUpdatedEventService = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findById(eventId);

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "approved" || event.editRequestStatus !== "review") {
    const error = new Error(
      "Only approved events with pending edits can be approved",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!event.pendingEdit) {
    const error = new Error("Pending edit data not found");
    error.statusCode = 400;
    throw error;
  }

  const {
    eventName,
    description,
    category,
    location,
    eventDate,
    startTime,
    endTime,
    tickets,
    bookingPolicy,
    banner,
    promoVideo,
  } = event.pendingEdit;

  if (
    !eventName ||
    !description ||
    !category ||
    !location ||
    !eventDate ||
    !startTime ||
    !endTime ||
    !Array.isArray(tickets) ||
    tickets.length === 0 ||
    !bookingPolicy
  ) {
    const error = new Error("Pending edit data is incomplete");
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(category)) {
    const error = new Error("Invalid category ID");
    error.statusCode = 400;
    throw error;
  }

  const categoryExists = await Category.findOne({
    _id: category,
    isActive: true,
  });

  if (!categoryExists) {
    const error = new Error("Category does not exist or is inactive");
    error.statusCode = 400;
    throw error;
  }

  if (typeof banner !== "string" || !banner.trim()) {
    const error = new Error("Valid event banner URL is required");
    error.statusCode = 400;
    throw error;
  }

  const originalTickets = event.tickets;

  const originalTicketMap = new Map(
    originalTickets.map((ticket) => [ticket._id.toString(), ticket]),
  );

  const pendingTicketIds = new Set();
  const approvedTickets = [];

  for (const ticket of tickets) {
    const { _id, name, price, quantity } = ticket;

    if (
      typeof name !== "string" ||
      !name.trim() ||
      !Number.isFinite(Number(price)) ||
      Number(price) < 0.01 ||
      !Number.isInteger(Number(quantity)) ||
      Number(quantity) < 1
    ) {
      const error = new Error("Invalid ticket details");
      error.statusCode = 400;
      throw error;
    }

    let originalTicket = null;

    if (_id) {
      if (!mongoose.Types.ObjectId.isValid(_id)) {
        const error = new Error("Invalid ticket ID");
        error.statusCode = 400;
        throw error;
      }

      const ticketId = _id.toString();

      if (pendingTicketIds.has(ticketId)) {
        const error = new Error("Duplicate ticket ID");
        error.statusCode = 400;
        throw error;
      }

      originalTicket = originalTicketMap.get(ticketId);

      if (originalTicket) {
        pendingTicketIds.add(ticketId);
      } else {
        originalTicket = null;
      }
    }

    if (originalTicket) {
      const sold = originalTicket.sold ?? 0;
      const reserved = originalTicket.reserved ?? 0;
      const committedTickets = sold + reserved;

      if (Number(quantity) < committedTickets) {
        const error = new Error(
          `Ticket "${name}" quantity cannot be less than its sold and reserved tickets (${committedTickets})`,
        );
        error.statusCode = 400;
        throw error;
      }

      approvedTickets.push({
        _id: originalTicket._id,
        name: name.trim(),
        price: Number(price),
        quantity: Number(quantity),
        sold,
        reserved,
      });
    } else {
      approvedTickets.push({
        name: name.trim(),
        price: Number(price),
        quantity: Number(quantity),
        sold: 0,
        reserved: 0,
      });
    }
  }

  // Existing tickets with sales or reservations cannot be removed.
  for (const originalTicket of originalTickets) {
    const ticketId = originalTicket._id.toString();

    if (!pendingTicketIds.has(ticketId)) {
      if (
        (originalTicket.sold ?? 0) > 0 ||
        (originalTicket.reserved ?? 0) > 0
      ) {
        const error = new Error(
          `Cannot remove ticket "${originalTicket.name}" because it has sold or reserved tickets`,
        );
        error.statusCode = 400;
        throw error;
      }
    }
  }

  const updateValues = {
    eventName,
    description,
    category,
    location,
    eventDate,
    startTime,
    endTime,
    tickets: approvedTickets,
    bookingPolicy,
    banner: banner.trim(),
    promoVideo: promoVideo ?? null,
  };

  Object.assign(event, updateValues);

  event.pendingEdit = undefined;
  event.editRequestStatus = "none";
  event.editRequestRejectionReason = undefined;
  event.editReviewRejectionReason = undefined;

  // Keep the existing visibility behavior for now.
  event.isVisible = true;

  return await event.save();
};

export const rejectUpdatedEventService = async (eventId, rejectionReason) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findById(eventId);

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "approved" || event.editRequestStatus !== "review") {
    const error = new Error(
      "Only approved events with pending edits can be rejected",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!event.pendingEdit) {
    const error = new Error("Pending edit data not found");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof rejectionReason !== "string" ||
    rejectionReason.trim().length === 0
  ) {
    const error = new Error("A rejection reason is required");
    error.statusCode = 400;
    throw error;
  }

  event.editRequestStatus = "rejected";
  event.editReviewRejectionReason = rejectionReason.trim();
  event.isVisible = false;

  return await event.save();
};

export const resubmitRejectedEventService = async (
  hostId,
  eventId,
  eventData,
) => {
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

  if (event.status !== "approved" || event.editRequestStatus !== "rejected") {
    const error = new Error(
      "Only rejected updates of approved events can be resubmitted",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!event.pendingEdit) {
    const error = new Error("Pending edit data not found");
    error.statusCode = 400;
    throw error;
  }

  const {
    eventName,
    description,
    category,
    location,
    eventDate,
    startTime,
    endTime,
    tickets,
    bookingPolicy,
    bannerFile,
    promoVideoFile,
  } = eventData;

  if (
    !eventName ||
    !description ||
    !category ||
    !location ||
    !eventDate ||
    !startTime ||
    !endTime ||
    !Array.isArray(tickets) ||
    tickets.length === 0 ||
    !bookingPolicy
  ) {
    const error = new Error("Required event fields are missing");
    error.statusCode = 400;
    throw error;
  }

  if (!mongoose.Types.ObjectId.isValid(category)) {
    const error = new Error("Invalid category ID");
    error.statusCode = 400;
    throw error;
  }

  const categoryExists = await Category.findOne({
    _id: category,
    isActive: true,
  });

  if (!categoryExists) {
    const error = new Error("Category does not exist or is inactive");
    error.statusCode = 400;
    throw error;
  }

  let banner = event.pendingEdit.banner;

  if (bannerFile) {
    banner = await uploadEventBanner(bannerFile);
  }

  if (typeof banner !== "string" || !banner.trim()) {
    const error = new Error("A valid event banner URL is required");
    error.statusCode = 400;
    throw error;
  }
  let promoVideo = event.pendingEdit.promoVideo ?? event.promoVideo ?? null;

  if (promoVideoFile) {
    promoVideo = await uploadPromoVideo(promoVideoFile);
  }
  event.pendingEdit = {
    eventName,
    description,
    category,
    location,
    eventDate,
    startTime,
    endTime,
    tickets,
    bookingPolicy,
    banner,
    promoVideo,
  };

  event.editRequestStatus = "review";
  event.editReviewRejectionReason = undefined;
  event.isVisible = false;

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

export const getAllAdminEventsService = async ({
  status,
  search,
  editRequestStatus,
  page = 1,
  limit = 10,
}) => {
  const filter = {};

  if (status && status !== "all") {
    filter.status = status;
  }

  if (editRequestStatus && editRequestStatus !== "all") {
    filter.editRequestStatus = editRequestStatus;
  }

  if (search) {
    filter.eventName = {
      $regex: search,
      $options: "i",
    };
  }

  const skip = (page - 1) * limit;

  const [events, totalEvents, statusCounts] = await Promise.all([
    Event.find(filter)
      .populate("host", "name email")
      .populate("category", "name slug")
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Event.countDocuments(filter),

    Event.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const counts = {
    total: 0,
    draft: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    cancelled: 0,
    completed: 0,
    hidden: 0,
  };

  statusCounts.forEach(({ _id, count }) => {
    counts[_id] = count;
    counts.total += count;
  });

  counts.hidden = await Event.countDocuments({
    isVisible: false,
  });

  const editRequestCounts = await Event.aggregate([
    {
      $group: {
        _id: "$editRequestStatus",
        count: { $sum: 1 },
      },
    },
  ]);

  const editRequests = {
    none: 0,
    pending: 0,
    rejected: 0,
    editing: 0,
    review: 0,
  };

  editRequestCounts.forEach(({ _id, count }) => {
    if (_id && Object.hasOwn(editRequests, _id)) {
      editRequests[_id] = count;
    }
  });

  return {
    events,
    counts,
    editRequests,
    pagination: {
      page,
      limit,
      totalEvents,
      totalPages: Math.ceil(totalEvents / limit),
    },
  };
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

export const unhideEventService = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findById(eventId);

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "approved") {
    const error = new Error("Only approved events can be made visible");
    error.statusCode = 400;
    throw error;
  }

  event.isVisible = true;

  await event.save();

  return event;
};

export const requestEventEditService = async (eventId, hostId) => {
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
  if (event.status !== "approved") {
    const error = new Error("Only approved events can be allowed to edit");
    error.statusCode = 400;
    throw error;
  }
  if (["pending", "editing", "review"].includes(event.editRequestStatus)) {
    const error = new Error(
      `Edit request status is ${event.editRequestStatus}`,
    );
    error.statusCode = 400;
    throw error;
  }
  event.editRequestStatus = "pending";
  event.editRequestRejectionReason = "";
  await event.save();
  return event;
};

export const approveEventEditRequestService = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findById(eventId);

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "approved" || event.editRequestStatus !== "pending") {
    const error = new Error("Only approved events can be edited");
    error.statusCode = 400;
    throw error;
  }
  event.editRequestStatus = "editing";
  event.isVisible = false;
  await event.save();

  return event;
};

export const rejectEventEditRequestService = async (
  eventId,
  rejectionReason,
) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findById(eventId);

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "approved" || event.editRequestStatus !== "pending") {
    const error = new Error("Only approved events can be rejected");
    error.statusCode = 400;
    throw error;
  }
  if (typeof rejectionReason !== "string") {
    const error = new Error("Rejection reason should be in string");
    error.statusCode = 400;
    throw error;
  }
  if (rejectionReason.trim().length === 0) {
    const error = new Error("Add rejection reason");
    error.statusCode = 400;
    throw error;
  }
  event.editRequestStatus = "rejected";
  event.editRequestRejectionReason = rejectionReason.trim();
  event.isVisible = true;
  await event.save();
  return event;
};

export const getPendingEventEditRequestsService = async () => {
  return await Event.find({
    status: "approved",
    editRequestStatus: { $in: ["pending", "review"] },
  })
    .populate("host", "name email")
    .populate("category", "name slug")
    .sort({ updated_at: -1 });
};

export const updateEventPromotionService = async (eventId, promotionData) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID.");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findById(eventId);

  if (!event) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "approved") {
    const error = new Error(
      "Only approved events can be featured or highlighted.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!event.isVisible) {
    const error = new Error(
      "Hidden events cannot be featured or highlighted. Make the event visible first.",
    );
    error.statusCode = 400;
    throw error;
  }

  const { isFeatured, isHighlighted, featuredPriority, featuredUntil } =
    promotionData;

  if (isFeatured !== undefined && typeof isFeatured !== "boolean") {
    const error = new Error("isFeatured must be a boolean.");
    error.statusCode = 400;
    throw error;
  }

  if (isHighlighted !== undefined && typeof isHighlighted !== "boolean") {
    const error = new Error("isHighlighted must be a boolean.");
    error.statusCode = 400;
    throw error;
  }

  if (
    featuredPriority !== undefined &&
    (!Number.isInteger(Number(featuredPriority)) ||
      Number(featuredPriority) < 0)
  ) {
    const error = new Error(
      "Featured priority must be a non-negative integer.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (featuredUntil !== undefined && featuredUntil !== null) {
    const expiryDate = new Date(featuredUntil);

    if (Number.isNaN(expiryDate.getTime())) {
      const error = new Error("Invalid featured expiry date.");
      error.statusCode = 400;
      throw error;
    }

    if (expiryDate <= new Date()) {
      const error = new Error("Featured expiry date must be in the future.");
      error.statusCode = 400;
      throw error;
    }

    event.featuredUntil = expiryDate;
  }

  if (isFeatured !== undefined) {
    event.isFeatured = isFeatured;
  }

  if (isHighlighted !== undefined) {
    event.isHighlighted = isHighlighted;
  }

  if (featuredPriority !== undefined) {
    event.featuredPriority = Number(featuredPriority);
  }

  if (event.isFeatured !== true && event.isHighlighted !== true) {
    event.featuredPriority = 0;
    event.featuredUntil = null;
  }

  await event.save();

  return event;
};

const activePromotionFilter = {
  status: "approved",
  isVisible: true,
  $or: [{ featuredUntil: null }, { featuredUntil: { $gt: new Date() } }],
};

export const getFeaturedEventsService = async (limit = 6) => {
  const events = await Event.find({
    ...activePromotionFilter,
    isFeatured: true,
  })
    .populate("category", "name slug")
    .sort({
      featuredPriority: -1,
      created_at: -1,
    })
    .limit(limit);

  return events;
};

export const getHighlightedEventsService = async (limit = 6) => {
  const events = await Event.find({
    ...activePromotionFilter,
    isHighlighted: true,
  })
    .populate("category", "name slug")
    .sort({
      featuredPriority: -1,
      created_at: -1,
    })
    .limit(limit);

  return events;
};

export const getMostBookedEventsService = async (limit = 6) => {
  const mostBooked = await Booking.aggregate([
    {
      $match: {
        bookingStatus: "confirmed",
        paymentStatus: "successful",
      },
    },
    {
      $unwind: "$tickets",
    },
    {
      $group: {
        _id: "$event",
        highestSelling: { $sum: "$tickets.quantity" },
      },
    },
    {
      $sort: {
        highestSelling: -1,
      },
    },
    { $limit: limit },
  ]);

  if (!mostBooked.length) return [];

  const eventIds = mostBooked.map((item) => item._id);

  const events = await Event.find({
    _id: eventIds,
    status: "approved",
    isVisible: true,
  }).populate("category", "name slug");

  const eventsMap = new Map(
    events.map((event) => [event._id.toString(), event]),
  );

  const result = mostBooked
    .map((item) => {
      const event = eventsMap.get(item._id.toString());
      if (!event) return;
      return { ...event.toObject(), highestSelling: item.highestSelling };
    })
    .filter(Boolean);

  return result;
};
