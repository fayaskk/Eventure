import { createEventReportService } from "../../../services/eventReport.service.js";

export const createEventReport = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { eventId } = req.params;

    const { reason, description } = req.body;

    if (!reason || typeof reason !== "string") {
      return res.status(400).json({
        success: false,
        message: "Reason is required and must be a string",
      });
    }

    if (description !== undefined && typeof description !== "string") {
      return res.status(400).json({
        success: false,
        message: "Description must be a string",
      });
    }

    const report = await createEventReportService(
      eventId,
      userId,
      reason,
      description,
    );

    return res.status(201).json({
      success: true,
      message: "Event reported successfully",
      report,
    });
  } catch (error) {
    console.error("Report event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};


