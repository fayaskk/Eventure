import { getWalletDetailsService } from "../../../services/wallet.service.js";

export const getWallet = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = req.query.limit ? Number(req.query.limit) : 10;

    const walletDetails = await getWalletDetailsService(
      userId,
      page,
      limit,
    );

    return res.status(200).json({
      success: true,
      message: "Wallet details fetched successfully",
      data: walletDetails,
    });
  } catch (error) {
    next(error);
  }
};