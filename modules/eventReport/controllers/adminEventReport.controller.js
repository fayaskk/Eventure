import {
    dismissEventReportService,
  getReportedEventsService,
  getReportsByEventService,resolveEventReportService
} from "../../../services/eventReport.service.js";


export const getReportedEvents = async (req, res) => {
  try {
    const reportedEvents = await getReportedEventsService();

    return res.status(200).json({
      success: true,
      message: "Reported events fetched successfully",
      reportedEvents,
    });
  } catch (error) {
    console.error("Reported events error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};



export const getReportsByEvent = async (req, res) => {
  try {
    const { eventId } = req.params;

    const reports = await getReportsByEventService(eventId);

    return res.status(200).json({
      success: true,
      message: "Reports fetched successfully",
      reports,
    });
  } catch (error) {
    console.error("Get reports by event error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};


export const dismissEventReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const report = await dismissEventReportService(reportId);

    return res.status(200).json({
      success: true,
      message: "Event report dismissed successfully",
      report,
    });
  } catch (error) {
    console.error("Event report dismiss controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};
export const resolveEventReport = async (req, res) => {
  try {
    const { reportId } = req.params;

    const resolvedReports = await resolveEventReportService(reportId);

    return res.status(200).json({
      success: true,
      message: "Event report resolved and event hidden successfully",
      reports: resolvedReports,
    });
  } catch (error) {
    console.error("Event report resolve controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};