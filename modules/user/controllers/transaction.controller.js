import { getTransactionHistoryService } from "../../../services/transactionHistory.service.js";

export const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;
    const type = req.query.type || "all";

    const transactionHistory = await getTransactionHistoryService(
      userId,
      page,
      limit,
      type,
    );

    return res.status(200).json({
      success: true,
      message: "Transaction history fetched successfully",
      data: transactionHistory,
    });
  } catch (error) {
    next(error);
  }
};