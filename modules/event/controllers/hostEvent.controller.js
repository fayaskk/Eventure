import {
  createEventService,
  getHostEventsService,
  getHostEventByIdService,
  updateHostEventService,
  submitHostEventService,
  requestEventEditService,
  resubmitRejectedEventService,
} from "../../../services/event.service.js";

export const createHostEvent = async (req, res) => {
  try {
    const hostId = req.user.userId;

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
      status,
    } = req.body;

    if (!eventName || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Event name, description and category are required.",
      });
    }

    const bannerFile = req.files?.banner?.[0];
    const promoVideoFile = req.files?.promoVideo?.[0];

    if (!bannerFile) {
      return res.status(400).json({
        success: false,
        message: "Event banner is required.",
      });
    }

    let parsedLocation;
    let parsedTickets;
    let parsedBookingPolicy = {
      allowAfterStart: false,
    };

    try {
      parsedLocation = JSON.parse(location);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid location data.",
      });
    }

    try {
      parsedTickets = JSON.parse(tickets);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket data.",
      });
    }

    if (bookingPolicy) {
      try {
        parsedBookingPolicy = JSON.parse(bookingPolicy);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid booking policy data.",
        });
      }
    }

    const { venue, address, city, state, pincode } = parsedLocation;

    if (!venue || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "All location details must be provided.",
      });
    }

    if (!Array.isArray(parsedTickets) || parsedTickets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one ticket type is required.",
      });
    }

    for (const ticket of parsedTickets) {
      if (
        !ticket.name ||
        ticket.price === undefined ||
        ticket.quantity === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Each ticket must have name, price and quantity.",
        });
      }
    }

    const eventData = {
      eventName,
      description,
      category,
      bannerFile,
      promoVideoFile,
      location: parsedLocation,
      eventDate,
      startTime,
      endTime,
      tickets: parsedTickets,
      bookingPolicy: parsedBookingPolicy,
      status: status || "pending",
    };

    const event = await createEventService(hostId, eventData);

    return res.status(201).json({
      success: true,
      message:
        status === "draft"
          ? "Event draft saved successfully."
          : "Event created successfully.",
      data: event,
    });
  } catch (error) {
    console.error("Event creation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

export const getHostEvents = async (req, res) => {
  try {
    const hostId = req.user.userId;

    const events = await getHostEventsService(hostId);

    return res.status(200).json({
      success: true,
      message: "Host events fetched successfully.",
      data: events,
    });
  } catch (error) {
    console.error("Get host events error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

export const getHostEventById = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { eventId } = req.params;

    const event = await getHostEventByIdService(hostId, eventId);

    return res.status(200).json({
      success: true,
      message: "Event fetched successfully.",
      data: event,
    });
  } catch (error) {
    console.error("Get host event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

export const updateHostEvent = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { eventId } = req.params;

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
    } = req.body;

    if (!eventName || !description || !category) {
      return res.status(400).json({
        success: false,
        message: "Event name, description and category are required.",
      });
    }

    let parsedLocation;
    let parsedTickets;
    let parsedBookingPolicy = {
      allowAfterStart: false,
    };

    try {
      parsedLocation = JSON.parse(location);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid location data.",
      });
    }

    try {
      parsedTickets = JSON.parse(tickets);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket data.",
      });
    }

    if (bookingPolicy) {
      try {
        parsedBookingPolicy = JSON.parse(bookingPolicy);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid booking policy data.",
        });
      }
    }

    const { venue, address, city, state, pincode } = parsedLocation;

    if (!venue || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "All location details must be provided.",
      });
    }

    if (!Array.isArray(parsedTickets) || parsedTickets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one ticket type is required.",
      });
    }

    for (const ticket of parsedTickets) {
      if (
        !ticket.name ||
        ticket.price === undefined ||
        ticket.quantity === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Each ticket must have name, price and quantity.",
        });
      }
    }
    const eventData = {
      eventName,
      description,
      category,
      location: parsedLocation,
      eventDate,
      startTime,
      endTime,
      tickets: parsedTickets,
      bookingPolicy: parsedBookingPolicy,
      bannerFile: req.files?.banner?.[0] || null,
      promoVideoFile: req.files?.promoVideo?.[0] || null,
    };

    const event = await updateHostEventService(hostId, eventId, eventData);

    return res.status(200).json({
      success: true,
      message: "Event updated successfully.",
      data: event,
    });
  } catch (error) {
    console.error("Update host event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

export const submitHostEvent = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { eventId } = req.params;

    const event = await submitHostEventService(hostId, eventId);

    return res.status(200).json({
      success: true,
      message: "Event submitted for approval.",
      data: event,
    });
  } catch (error) {
    console.error("Submit host event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

export const requestEventEdit = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { eventId } = req.params;

    const editEventRequest = await requestEventEditService(eventId, hostId);

    return res.status(200).json({
      success: true,
      message: "Event edit request status pending",
      data: editEventRequest,
    });
  } catch (error) {
    console.error("Event edit request error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

export const resubmitRejectedEvent = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { eventId } = req.params;

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
    } = req.body;
    console.log(req.body);
    if (
      !eventName ||
      !description ||
      !category ||
      !location ||
      !eventDate ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        success: false,
        message: "All required event fields must be provided.",
      });
    }

    let parsedLocation;
    let parsedTickets;
    let parsedBookingPolicy = {
      allowAfterStart: false,
    };

    try {
      parsedLocation = JSON.parse(location);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid location data.",
      });
    }

    try {
      parsedTickets = JSON.parse(tickets);
    } catch {
      return res.status(400).json({
        success: false,
        message: "Invalid ticket data.",
      });
    }

    if (bookingPolicy) {
      try {
        parsedBookingPolicy = JSON.parse(bookingPolicy);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid booking policy data.",
        });
      }
    }

    if (
      !parsedLocation ||
      typeof parsedLocation !== "object" ||
      Array.isArray(parsedLocation)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid location data.",
      });
    }

    const { venue, address, city, state, pincode } = parsedLocation;

    if (!venue || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "All location details must be provided.",
      });
    }

    if (!Array.isArray(parsedTickets) || parsedTickets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one ticket type is required.",
      });
    }

    for (const ticket of parsedTickets) {
      if (
        !ticket.name ||
        ticket.price === undefined ||
        ticket.quantity === undefined ||
        !Number.isFinite(Number(ticket.price)) ||
        Number(ticket.price) < 0.01 ||
        !Number.isInteger(Number(ticket.quantity)) ||
        Number(ticket.quantity) < 1
      ) {
        return res.status(400).json({
          success: false,
          message: "Each ticket must have a valid name, price and quantity.",
        });
      }
    }

    const eventData = {
      eventName,
      description,
      category,
      location: parsedLocation,
      eventDate,
      startTime,
      endTime,
      tickets: parsedTickets,
      bookingPolicy: parsedBookingPolicy,
      bannerFile: req.files?.banner?.[0] || null,
      promoVideoFile: req.files?.promoVideo?.[0] || null,
    };

    const resubmittedRejectedEvent = await resubmitRejectedEventService(
      hostId,
      eventId,
      eventData,
    );

    return res.status(200).json({
      success: true,
      message: "Updated event resubmitted for admin review.",
      data: resubmittedRejectedEvent,
    });
  } catch (error) {
    console.error("Resubmit rejected event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error.",
    });
  }
};
