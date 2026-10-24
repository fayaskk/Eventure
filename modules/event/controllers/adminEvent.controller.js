import {
  approveEventService,
  getAllAdminEventsService,
  getAdminEventByIdService,
  getPendingEventsService,
  rejectEventService,
  hideEventService,
  unhideEventService,
  approveEventEditRequestService,
  rejectEventEditRequestService,
  approveUpdatedEventService,
  rejectUpdatedEventService,
  getPendingEventEditRequestsService,
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

export const getAllAdminEvents = async (req, res) => {
  try {
    const status = String(req.query.status || "all")
      .trim()
      .toLowerCase();

    const search = String(req.query.search || "").trim();

    const editRequestStatus = String(req.query.editRequestStatus || "all")
      .trim()
      .toLowerCase();

    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    const allowedStatuses = [
      "all",
      "draft",
      "pending",
      "approved",
      "rejected",
      "cancelled",
      "completed",
    ];

    const allowedEditRequestStatuses = [
      "all",
      "none",
      "pending",
      "rejected",
      "editing",
      "review",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event status.",
      });
    }

    if (!allowedEditRequestStatuses.includes(editRequestStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid edit request status.",
      });
    }

    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid pagination parameters.",
      });
    }

    const result = await getAllAdminEventsService({
      status,
      search,
      editRequestStatus,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Events fetched successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Get all admin events error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error.",
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

    const event = await rejectEventService(eventId, rejectionReason);

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

export const hideEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await hideEventService(eventId);

    return res.status(200).json({
      success: true,
      message: "Event hidden successfully",
      event,
    });
  } catch (error) {
    console.error("Hide event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const unhideEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const event = await unhideEventService(eventId);

    return res.status(200).json({
      success: true,
      message: "Event made visible successfully",
      event,
    });
  } catch (error) {
    console.error("Unhide event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const approveEventEditRequest = async (req, res) => {
  try {
    const { eventId } = req.params;
    const approvedEventEditRequest =
      await approveEventEditRequestService(eventId);
    return res.status(200).json({
      success: true,
      message: "Edit event request approved",
      data: approvedEventEditRequest,
    });
  } catch (error) {
    console.error("Approve edit event error :", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const rejectEventEditRequest = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rejectionReason } = req.body;

    const rejectedEventEditRequest = await rejectEventEditRequestService(
      eventId,
      rejectionReason,
    );

    return res.status(200).json({
      success: true,
      message: "Reject edit event request successful",
      data: rejectedEventEditRequest,
    });
  } catch (error) {
    console.error("Reject edit event request error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const approveUpdatedEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const approvedUpdatedEvent = await approveUpdatedEventService(eventId);
    return res.status(200).json({
      success: true,
      message: "Updated edit event request approved",
      data: approvedUpdatedEvent,
    });
  } catch (error) {
    console.error("Approve updated edit event request error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const rejectUpdatedEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { rejectionReason } = req.body;

    const rejectedUpdateEvent = await rejectUpdatedEventService(
      eventId,
      rejectionReason,
    );
    return res.status(200).json({
      success: true,
      message: "Update edit event rejected",
      data: rejectedUpdateEvent,
    });
  } catch (error) {
    console.error("Reject updated edit event request error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getPendingEventEditRequests = async (req, res) => {
  try {
    const events = await getPendingEventEditRequestsService();

    return res.status(200).json({
      success: true,
      count: events.length,
      data: events,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch event edit requests.",
    });
  }
};
