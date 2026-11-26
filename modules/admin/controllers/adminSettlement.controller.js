import {
  getAllSettlementsService,
  getSettlementByIdService,
  approveSettlementService,
  rejectSettlementService,
  markSettlementAsPaidService,
} from "../../../services/adminSettlement.service.js";

export const getAllSettlements = async (req, res) => {
  try {
    const settlements = await getAllSettlementsService();

    return res.status(200).json({
      success: true,
      settlements,
    });
  } catch (error) {
    console.error("Get all settlements error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getSettlementById = async (req, res) => {
  try {
    const settlement = await getSettlementByIdService(req.params.id);

    return res.status(200).json({
      success: true,
      settlement,
    });
  } catch (error) {
    console.error("Get settlement details error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const approveSettlement = async (req, res) => {
  try {
    const settlement = await approveSettlementService(
      req.params.id,
      req.user.userId,
    );

    return res.status(200).json({
      success: true,
      message: "Settlement approved successfully",
      settlement,
    });
  } catch (error) {
    console.error("Approve settlement error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const rejectSettlement = async (req, res) => {
  try {
    const { adminNote } = req.body;

    if (!adminNote || !adminNote.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    const settlement = await rejectSettlementService(
      req.params.id,
      req.user.userId,
      adminNote.trim(),
    );

    return res.status(200).json({
      success: true,
      message: "Settlement rejected successfully",
      settlement,
    });
  } catch (error) {
    console.error("Reject settlement error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const markSettlementAsPaid = async (req, res) => {
  try {
    const { paymentReference, adminNote } = req.body;

    if (!paymentReference || !paymentReference.trim()) {
      return res.status(400).json({
        success: false,
        message: "Bank or UPI transaction reference is required",
      });
    }

    const settlement = await markSettlementAsPaidService(
      req.params.id,
      req.user.userId,
      paymentReference.trim(),
      adminNote?.trim(),
    );

    return res.status(200).json({
      success: true,
      message: "Settlement marked as paid successfully",
      settlement,
    });
  } catch (error) {
    console.error("Mark settlement as paid error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};