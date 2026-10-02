import {
  approveEventService,
  getAdminEventByIdService,
  getPendingEventsService,
  rejectEventService,
} from "../../../services/event.service.js";

export const getPendingEvents = async (req, res) => {
  try {
    const events = await getPendingEventsService();

    if (events.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No pending events found",
        events: [],
      });
    }

    return res.status(200).json({
      success: true,
      message: "Events fetched successfully",
      events,
    });
  } catch (error) {
    console.error("Get events error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getAdminEventById = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await getAdminEventByIdService(eventId);

    return res.status(200).json({
      success: true,
      message: "Event fetched successfully",
      event,
    });
  } catch (error) {
    console.error("Get event by id error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const approveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await approveEventService(eventId);

    return res.status(200).json({
      success: true,
      message: "Event approved successfully",
      event,
    });
  } catch (error) {
    console.error("Approve event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const rejectEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rejectionReason } = req.body;

    const event = await rejectEventService(
      eventId,
      rejectionReason
    );

    return res.status(200).json({
      success: true,
      message: "Event rejected successfully",
      event,
    });
  } catch (error) {
    console.error("Reject event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};