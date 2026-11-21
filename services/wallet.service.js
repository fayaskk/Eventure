import mongoose from "mongoose";
import { Wallet } from "../models/wallet.model.js";
import { User } from "../models/user.model.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateUserId = (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw createError("Invalid user ID", 400);
  }
};

const validateAmount = (amountPaise, operation) => {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw createError(
      `${operation} amount must be a positive safe integer`,
      400,
    );
  }
};

const validateIdempotencyKey = (idempotencyKey) => {
  if (
    !idempotencyKey ||
    typeof idempotencyKey !== "string" ||
    !idempotencyKey.trim()
  ) {
    throw createError("Valid idempotency key is required", 400);
  }

  return idempotencyKey.trim();
};

const validateReason = (reason) => {
  const allowedReasons = [
    "refund",
    "booking",
    "admin_credit",
    "booking_cancellation",
    "other",
  ];

  if (!allowedReasons.includes(reason)) {
    throw createError("Invalid wallet transaction reason", 400);
  }
};

const validateExistingTransaction = (
  transaction,
  { userId, amountPaise, type, reason, referenceType, referenceId },
) => {
  const isSameRequest =
    transaction.user.toString() === userId.toString() &&
    transaction.amountPaise === amountPaise &&
    transaction.type === type &&
    transaction.reason === reason &&
    transaction.referenceType === referenceType &&
    transaction.referenceId?.toString() === referenceId?.toString();

  if (!isSameRequest) {
    throw createError(
      "Idempotency key already used for another transaction",
      409,
    );
  }

  return {
    transaction,
    alreadyProcessed: true,
  };
};

const getExistingTransaction = async (requestData) => {
  const transaction = await WalletTransaction.findOne({
    idempotencyKey: requestData.idempotencyKey,
  });

  if (!transaction) {
    return null;
  }

  return validateExistingTransaction(transaction, requestData);
};

const handleDuplicateTransaction = async (error, requestData) => {
  if (error.code !== 11000) {
    throw error;
  }

  const existingTransaction = await getExistingTransaction(requestData);

  if (!existingTransaction) {
    throw error;
  }

  return existingTransaction;
};

export const getOrCreateWalletService = async (userId) => {
  validateUserId(userId);

  const user = await User.findById(userId).select("_id");

  if (!user) {
    throw createError("User not found", 404);
  }

  const wallet = await Wallet.findOneAndUpdate(
    { user: userId },
    {
      $setOnInsert: {
        user: userId,
        balancePaise: 0,
        currency: "INR",
      },
    },
    {
      upsert: true,
      new: true,
      runValidators: true,
    },
  );

  if (!wallet.isActive) {
    throw createError("Wallet is inactive", 403);
  }

  return wallet;
};

export const getWalletDetailsService = async (userId, page = 1, limit = 10) => {
  validateUserId(userId);

  if (!Number.isInteger(page) || page < 1) {
    throw createError("Page number should be a positive integer", 400);
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw createError("Limit should be between 1 and 50", 400);
  }

  const wallet = await getOrCreateWalletService(userId);

  const skip = (page - 1) * limit;

  const [transactions, totalTransactions] = await Promise.all([
    WalletTransaction.find({ wallet: wallet._id })
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    WalletTransaction.countDocuments({ wallet: wallet._id }),
  ]);

  return {
    wallet: {
      balancePaise: wallet.balancePaise,
      balance: wallet.balancePaise / 100,
      currency: wallet.currency,
    },
    transactions,
    pagination: {
      currentPage: page,
      limit,
      totalTransactions,
      totalPages: Math.ceil(totalTransactions / limit),
    },
  };
};

export const creditWalletService = async ({
  userId,
  amountPaise,
  reason,
  description,
  referenceType,
  referenceId,
  idempotencyKey,
}) => {
  validateUserId(userId);
  validateAmount(amountPaise, "Credit");

  idempotencyKey = validateIdempotencyKey(idempotencyKey);
  validateReason(reason);

  const requestData = {
    userId,
    amountPaise,
    type: "credit",
    reason,
    referenceType,
    referenceId,
    idempotencyKey,
  };

  const wallet = await getOrCreateWalletService(userId);
  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const existingTransaction = await WalletTransaction.findOne({
        idempotencyKey,
      }).session(session);

      if (existingTransaction) {
        result = validateExistingTransaction(existingTransaction, requestData);

        return;
      }

      const updatedWallet = await Wallet.findOneAndUpdate(
        {
          _id: wallet._id,
          isActive: true,
        },
        {
          $inc: {
            balancePaise: amountPaise,
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!updatedWallet) {
        throw createError("Wallet not found or inactive", 404);
      }

      const [transaction] = await WalletTransaction.create(
        [
          {
            wallet: updatedWallet._id,
            user: userId,
            type: "credit",
            amountPaise,
            balanceAfterPaise: updatedWallet.balancePaise,
            reason,
            description,
            referenceType,
            referenceId,
            idempotencyKey,
          },
        ],
        { session },
      );

      result = {
        wallet: updatedWallet,
        transaction,
        alreadyProcessed: false,
      };
    });

    return result;
  } catch (error) {
    return await handleDuplicateTransaction(error, requestData);
  } finally {
    await session.endSession();
  }
};

export const debitWalletService = async ({
  userId,
  amountPaise,
  reason,
  description,
  referenceType,
  referenceId,
  idempotencyKey,
}) => {
  validateUserId(userId);
  validateAmount(amountPaise, "Debit");

  idempotencyKey = validateIdempotencyKey(idempotencyKey);
  validateReason(reason);

  const requestData = {
    userId,
    amountPaise,
    type: "debit",
    reason,
    referenceType,
    referenceId,
    idempotencyKey,
  };

  const wallet = await getOrCreateWalletService(userId);
  const session = await mongoose.startSession();

  let result;

  try {
    await session.withTransaction(async () => {
      const existingTransaction = await WalletTransaction.findOne({
        idempotencyKey,
      }).session(session);

      if (existingTransaction) {
        result = validateExistingTransaction(existingTransaction, requestData);

        return;
      }

      const updatedWallet = await Wallet.findOneAndUpdate(
        {
          _id: wallet._id,
          isActive: true,
          balancePaise: { $gte: amountPaise },
        },
        {
          $inc: {
            balancePaise: -amountPaise,
          },
        },
        {
          new: true,
          session,
          runValidators: true,
        },
      );

      if (!updatedWallet) {
        throw createError(
          "Insufficient wallet balance or inactive wallet",
          400,
        );
      }

      const [transaction] = await WalletTransaction.create(
        [
          {
            wallet: updatedWallet._id,
            user: userId,
            type: "debit",
            amountPaise,
            balanceAfterPaise: updatedWallet.balancePaise,
            reason,
            description,
            referenceType,
            referenceId,
            idempotencyKey,
          },
        ],
        { session },
      );

      result = {
        wallet: updatedWallet,
        transaction,
        alreadyProcessed: false,
      };
    });

    return result;
  } catch (error) {
    return await handleDuplicateTransaction(error, requestData);
  } finally {
    await session.endSession();
  }
};
