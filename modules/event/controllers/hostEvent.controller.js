import {
  createEventService,
  getHostEventsService,
  getHostEventByIdService,
  updateHostEventService,
  submitHostEventService,
} from "../../../services/event.service.js";

export const createHostEvent = async (req, res) => {
  try {
    const hostId = req.user.userId;

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
    } = req.body;

    if (
      !eventName ||
      !description ||
      !category ||
      !banner ||
      !location ||
      !eventDate ||
      !startTime ||
      !endTime ||
      !tickets
    ) {
      return res.status(400).json({
        success: false,
        message: "All required event details must be provided",
      });
    }

    const { venue, address, city, state, pincode } = location;

    if (!venue || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: "All location details must be provided",
      });
    }

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one ticket type is required",
      });
    }

    for (const ticket of tickets) {
      if (
        !ticket.name ||
        ticket.price === undefined ||
        ticket.quantity === undefined
      ) {
        return res.status(400).json({
          success: false,
          message: "Each ticket must have name, price and quantity",
        });
      }
    }

    const event = await createEventService(hostId, req.body);

    return res.status(201).json({
      success: true,
      message: "Event created successfully",
      data: event,
    });
  } catch (error) {
    console.error("Event creation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const getHostEvents = async (req, res) => {
  try {
    const hostId = req.user.userId;

    const events = await getHostEventsService(hostId);

    return res.status(200).json({
      success: true,
      message: "Host events fetched successfully",
      data: events,
    });
  } catch (error) {
    console.error("Get host events error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
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
      message: "Event fetched successfully",
      event,
    });
  } catch (error) {
    console.error("Get host event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const updateHostEvent = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { eventId } = req.params;

    const event = await updateHostEventService(hostId, eventId, req.body);

    return res.status(200).json({
      success: true,
      message: "Event updated successfully",
      data: event,
    });
  } catch (error) {
    console.error("Update host event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
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
      message: "Event submitted for approval",
      data: event,
    });
  } catch (error) {
    console.error("Submit host event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
