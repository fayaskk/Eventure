import { getHostFeedbackSummaryService ,getHostFeedbackEventsService, getHostEventFeedbackService} from "../../../services/feedback.service.js";

export const getHostFeedbackSummary = async (req, res) => {
  try {
    const hostId = req.user.userId;

    const summary = await getHostFeedbackSummaryService(hostId);

    return res.status(200).json({
      success: true,
      message: "Host feedback summary fetched successfully",
      data: summary,
    });
  } catch (error) {
    console.error("Get host feedback summary error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.statusCode
        ? error.message
        : "Failed to fetch feedback summary",
    });
  }
};

export const getHostFeedbackEvents = async (req, res) => {
  try {
    const hostId = req.user.userId;

    const events = await getHostFeedbackEventsService(hostId);

    return res.status(200).json({
      success: true,
      message: "Host feedback events fetched successfully",
      data: events,
    });
  } catch (error) {
    console.error("Get host feedback events error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch host feedback events",
    });
  }
};

export const getHostEventFeedback = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const hostId = req.user.userId;

    const data = await getHostEventFeedbackService(
      hostId,
      eventId,
      page,
      limit,
    );

    return res.status(200).json({
      success: true,
      message: "Event feedback fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Get host event feedback error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch event feedback",
    });
  }
};