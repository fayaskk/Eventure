import mongoose from "mongoose";

import { Settlement } from "../models/settlement.model.js";
import { Payment } from "../models/payment.model.js";
import { Refund } from "../models/refund.model.js";

const isValidPaise = (value) =>
  Number.isSafeInteger(value) && value >= 0;

const validateSettlementId = (settlementId) => {
  if (!mongoose.Types.ObjectId.isValid(settlementId)) {
    const error = new Error("Invalid settlement ID");
    error.statusCode = 400;
    throw error;
  }
};

const validateSettlementStructure = (settlement) => {
  if (!Array.isArray(settlement.payments) || !settlement.payments.length) {
    const error = new Error("Settlement does not contain any payments");
    error.statusCode = 400;
    throw error;
  }

  if (
    !Number.isSafeInteger(settlement.totalAmount) ||
    settlement.totalAmount <= 0
  ) {
    const error = new Error("Invalid settlement total amount");
    error.statusCode = 400;
    throw error;
  }

  const paymentIds = settlement.payments.map((item) => {
    if (
      !item.payment ||
      !mongoose.Types.ObjectId.isValid(item.payment)
    ) {
      const error = new Error(
        "Invalid payment reference found in settlement",
      );
      error.statusCode = 400;
      throw error;
    }

    return item.payment.toString();
  });

  if (new Set(paymentIds).size !== paymentIds.length) {
    const error = new Error("Duplicate payments found in settlement");
    error.statusCode = 409;
    throw error;
  }

  let calculatedTotal = 0;

  for (const item of settlement.payments) {
    if (
      !Number.isSafeInteger(item.amount) ||
      item.amount <= 0
    ) {
      const error = new Error(
        "Invalid payment amount found in settlement",
      );
      error.statusCode = 400;
      throw error;
    }

    calculatedTotal += item.amount;

    if (!Number.isSafeInteger(calculatedTotal)) {
      const error = new Error(
        "Settlement amount exceeds safe monetary limit",
      );
      error.statusCode = 400;
      throw error;
    }
  }

  if (calculatedTotal !== settlement.totalAmount) {
    const error = new Error(
      "Settlement total does not match its payment allocations",
    );
    error.statusCode = 409;
    throw error;
  }

  return paymentIds;
};

const validatePaymentFinancials = (payment) => {
  if (
    !isValidPaise(payment.amount) ||
    !isValidPaise(payment.platformFee) ||
    !isValidPaise(payment.hostEarnings) ||
    !isValidPaise(payment.totalRefundedPaise)
  ) {
    return false;
  }

  const allocatedTotal =
    payment.platformFee +
    payment.hostEarnings +
    payment.totalRefundedPaise;

  return (
    Number.isSafeInteger(allocatedTotal) &&
    allocatedTotal === payment.amount
  );
};

const getUnresolvedRefundBookingIds = async (
  bookingIds,
  session,
) => {
  const unresolvedRefunds = await Refund.find({
    booking: { $in: bookingIds },
    status: {
      $in: ["pending", "processing", "requires_reconciliation"],
    },
  })
    .select("booking")
    .session(session)
    .lean();

  return new Set(
    unresolvedRefunds.map((refund) => refund.booking.toString()),
  );
};

const validateSettlementPayments = async (settlement, session) => {
  const paymentIds = validateSettlementStructure(settlement);

  const payments = await Payment.find({
    _id: { $in: paymentIds },
    settlement: settlement._id,
    settlementStatus: "requested",
    status: { $in: ["successful", "partially_refunded"] },
  }).session(session);

  if (payments.length !== settlement.payments.length) {
    const error = new Error(
      "Some payments are no longer eligible for this settlement",
    );
    error.statusCode = 409;
    throw error;
  }

  const paymentMap = new Map(
    payments.map((payment) => [
      payment._id.toString(),
      payment,
    ]),
  );

  for (const item of settlement.payments) {
    const payment = paymentMap.get(item.payment.toString());

    if (!payment || !payment.booking) {
      const error = new Error(
        "Settlement contains an invalid payment or booking reference",
      );
      error.statusCode = 409;
      throw error;
    }

    if (
      !validatePaymentFinancials(payment) ||
      payment.hostEarnings !== item.amount
    ) {
      const error = new Error(
        "Payment financial allocations have changed or are invalid",
      );
      error.statusCode = 409;
      throw error;
    }
  }

  const bookingIds = [
    ...new Set(
      payments.map((payment) => payment.booking.toString()),
    ),
  ];

  const unresolvedBookingIds =
    await getUnresolvedRefundBookingIds(bookingIds, session);

  if (unresolvedBookingIds.size) {
    const error = new Error(
      "Settlement contains payments with unresolved refunds",
    );
    error.statusCode = 409;
    throw error;
  }

  return payments;
};

export const getAllSettlementsService = async () => {
  return await Settlement.find()
    .populate("host", "name email")
    .populate("event", "eventName eventDate")
    .sort({ created_at: -1 })
    .lean();
};

export const getSettlementByIdService = async (settlementId) => {
  validateSettlementId(settlementId);

  const settlement = await Settlement.findById(settlementId)
    .populate("host", "name email")
    .populate("event", "eventName eventDate")
    .populate("payments.payment")
    .populate("processedBy", "name email")
    .lean();

  if (!settlement) {
    const error = new Error("Settlement not found");
    error.statusCode = 404;
    throw error;
  }

  return settlement;
};

export const approveSettlementService = async (
  settlementId,
  adminId,
) => {
  validateSettlementId(settlementId);

  const session = await mongoose.startSession();

  try {
    let approvedSettlement;

    await session.withTransaction(async () => {
      const settlement = await Settlement.findOne({
        _id: settlementId,
        status: "pending",
      }).session(session);

      if (!settlement) {
        const existingSettlement = await Settlement.findById(
          settlementId,
        ).session(session);

        if (!existingSettlement) {
          const error = new Error("Settlement not found");
          error.statusCode = 404;
          throw error;
        }

        const error = new Error(
          `Settlement cannot be approved because its current status is ${existingSettlement.status}`,
        );
        error.statusCode = 409;
        throw error;
      }

      await validateSettlementPayments(settlement, session);

      settlement.status = "approved";
      settlement.processedBy = adminId;
      settlement.processedAt = new Date();

      await settlement.save({ session });

      approvedSettlement = settlement;
    });

    return approvedSettlement;
  } finally {
    await session.endSession();
  }
};

export const rejectSettlementService = async (
  settlementId,
  adminId,
  adminNote,
) => {
  validateSettlementId(settlementId);

  const session = await mongoose.startSession();

  try {
    let rejectedSettlement;

    await session.withTransaction(async () => {
      const settlement = await Settlement.findOne({
        _id: settlementId,
        status: "pending",
      }).session(session);

      if (!settlement) {
        const error = new Error(
          "Settlement not found or is no longer pending",
        );
        error.statusCode = 409;
        throw error;
      }

      const paymentIds = validateSettlementStructure(settlement);

      const payments = await Payment.find({
        _id: { $in: paymentIds },
        settlement: settlement._id,
        settlementStatus: "requested",
      }).session(session);

      if (payments.length !== paymentIds.length) {
        const error = new Error(
          "Unable to release all settlement payments",
        );
        error.statusCode = 409;
        throw error;
      }

      for (const payment of payments) {
        if (!payment.booking) {
          const error = new Error(
            "Settlement contains a payment with an invalid booking reference",
          );
          error.statusCode = 409;
          throw error;
        }
      }

      const bookingIds = [
        ...new Set(
          payments.map((payment) => payment.booking.toString()),
        ),
      ];

      const unresolvedBookingIds =
        await getUnresolvedRefundBookingIds(bookingIds, session);

      const settlementPaymentMap = new Map(
        settlement.payments.map((item) => [
          item.payment.toString(),
          item.amount,
        ]),
      );

      for (const payment of payments) {
        const hasUnresolvedRefund =
          unresolvedBookingIds.has(payment.booking.toString());

        const settlementAmount = settlementPaymentMap.get(
          payment._id.toString(),
        );

        const canBeReleased =
          ["successful", "partially_refunded"].includes(
            payment.status,
          ) &&
          validatePaymentFinancials(payment) &&
          payment.hostEarnings === settlementAmount &&
          !hasUnresolvedRefund;

        payment.settlementStatus = canBeReleased
          ? "available"
          : "on_hold";

        payment.settlement = null;

        await payment.save({ session });
      }

      settlement.status = "rejected";
      settlement.adminNote = adminNote || "";
      settlement.processedBy = adminId;
      settlement.processedAt = new Date();

      await settlement.save({ session });

      rejectedSettlement = settlement;
    });

    return rejectedSettlement;
  } finally {
    await session.endSession();
  }
};

export const markSettlementAsPaidService = async (
  settlementId,
  adminId,
  paymentReference,
  adminNote,
) => {
  validateSettlementId(settlementId);

  if (
    typeof paymentReference !== "string" ||
    !paymentReference.trim()
  ) {
    const error = new Error("Payment reference is required");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  try {
    let paidSettlement;

    await session.withTransaction(async () => {
      const settlement = await Settlement.findOne({
        _id: settlementId,
        status: "approved",
      }).session(session);

      if (!settlement) {
        const error = new Error(
          "Settlement not found or has not been approved",
        );
        error.statusCode = 409;
        throw error;
      }

      await validateSettlementPayments(settlement, session);

      const paymentIds = settlement.payments.map(
        (item) => item.payment,
      );

      const paymentUpdate = await Payment.updateMany(
        {
          _id: { $in: paymentIds },
          settlement: settlement._id,
          settlementStatus: "requested",
          status: { $in: ["successful", "partially_refunded"] },
        },
        {
          $set: {
            settlementStatus: "settled",
          },
        },
        { session },
      );

      if (paymentUpdate.modifiedCount !== paymentIds.length) {
        const error = new Error(
          "Unable to finalize all settlement payments",
        );
        error.statusCode = 409;
        throw error;
      }

      settlement.status = "paid";
      settlement.paymentReference = paymentReference.trim();
      settlement.processedBy = adminId;
      settlement.processedAt = new Date();

      if (adminNote) {
        settlement.adminNote = adminNote;
      }

      await settlement.save({ session });

      paidSettlement = settlement;
    });

    return paidSettlement;
  } finally {
    await session.endSession();
  }
};