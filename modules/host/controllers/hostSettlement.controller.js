import {
  createHostSettlementService,
  getHostSettlementSummaryService,
  getHostSettlementEventsService,
  getHostSettlementHistoryService,
} from "../../../services/settlement.service.js";

export const createHostSettlement = async (req, res) => {
  try {
    const settlement = await createHostSettlementService(
      req.user.userId,
      req.params.eventId,
    );

    return res.status(201).json({
      success: true,
      message: "Settlement request submitted successfully",
      settlement,
    });
  } catch (error) {
    console.error("Create host settlement error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getHostSettlementSummary = async (req, res) => {
  try {
    const summary = await getHostSettlementSummaryService(
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error("Get settlement summary error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getHostSettlementEvents = async (req, res) => {
  try {
    const events = await getHostSettlementEventsService(
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      events,
    });
  } catch (error) {
    console.error("Get settlement events error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getHostSettlementHistory = async (req, res) => {
  try {
    const settlements = await getHostSettlementHistoryService(
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      settlements,
    });
  } catch (error) {
    console.error("Get settlement history error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};