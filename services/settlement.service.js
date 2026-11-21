import mongoose from "mongoose";

import { Event } from "../models/event.model.js";
import { Booking } from "../models/booking.model.js";
import { Payment } from "../models/payment.model.js";
import { Refund } from "../models/refund.model.js";
import { Settlement } from "../models/settlement.model.js";

const isValidPaise = (value) =>
  Number.isSafeInteger(value) && value >= 0;

const isValidPaymentFinancials = (payment) => {
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

const unresolvedRefundStatuses = [
  "pending",
  "processing",
  "requires_reconciliation",
];

const refundRelatedPaymentStatuses = [
  "refund_pending",
  "refund_review",
  "refund_failed",
];

export const createHostSettlementService = async (
  hostId,
  eventId,
) => {
  if (
    !mongoose.Types.ObjectId.isValid(hostId) ||
    !mongoose.Types.ObjectId.isValid(eventId)
  ) {
    const error = new Error("Invalid host or event ID");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  try {
    let createdSettlement = null;
    let noEligiblePayments = false;

    await session.withTransaction(async () => {
      const event = await Event.findOne({
        _id: eventId,
        host: hostId,
      }).session(session);

      if (!event) {
        const error = new Error(
          "Event not found or unauthorized",
        );
        error.statusCode = 404;
        throw error;
      }

      if (event.status !== "completed") {
        const error = new Error(
          "Settlement can only be requested after event completion",
        );
        error.statusCode = 400;
        throw error;
      }

      const bookings = await Booking.find({
        event: eventId,
        bookingStatus: "confirmed",
        paymentStatus: "successful",
      })
        .select("_id")
        .session(session)
        .lean();

      if (!bookings.length) {
        const error = new Error(
          "No successful bookings found for this event",
        );
        error.statusCode = 400;
        throw error;
      }

      const bookingIds = bookings.map(
        (booking) => booking._id,
      );

      const payments = await Payment.find({
        booking: { $in: bookingIds },
        status: {
          $in: [
            "successful",
            "partially_refunded",
            "refund_pending",
            "refund_review",
            "refund_failed",
            "refunded",
          ],
        },
        settlementStatus: { $in: ["available", null] },
        settlement: null,
      }).session(session);

      if (!payments.length) {
        const error = new Error(
          "No eligible payments available for settlement",
        );
        error.statusCode = 400;
        throw error;
      }

      const unresolvedRefunds = await Refund.find({
        booking: { $in: bookingIds },
        status: {
          $in: unresolvedRefundStatuses,
        },
      })
        .select("booking")
        .session(session)
        .lean();

      const bookingsWithUnresolvedRefunds = new Set(
        unresolvedRefunds.map((refund) =>
          refund.booking.toString(),
        ),
      );

      const eligiblePayments = [];
      const paymentsToHold = [];

      for (const payment of payments) {
        const hasUnresolvedRefund =
          bookingsWithUnresolvedRefunds.has(
            payment.booking.toString(),
          );

        const validFinancials =
          isValidPaymentFinancials(payment);

        if (
          hasUnresolvedRefund ||
          refundRelatedPaymentStatuses.includes(
            payment.status,
          ) ||
          !validFinancials
        ) {
          paymentsToHold.push(payment._id);
          continue;
        }

        if (
          !["successful", "partially_refunded"].includes(
            payment.status,
          )
        ) {
          continue;
        }

        if (payment.hostEarnings === 0) {
          continue;
        }

        eligiblePayments.push(payment);
      }

      if (paymentsToHold.length) {
        await Payment.updateMany(
          {
            _id: { $in: paymentsToHold },
            settlementStatus: { $in: ["available", null] },
            settlement: null,
          },
          {
            $set: {
              settlementStatus: "on_hold",
            },
          },
          { session },
        );
      }

      if (!eligiblePayments.length) {
        noEligiblePayments = true;
        return;
      }

      const settlementPayments = eligiblePayments.map(
        (payment) => ({
          payment: payment._id,
          amount: payment.hostEarnings,
        }),
      );

      const totalAmount = settlementPayments.reduce(
        (total, item) => {
          const nextTotal = total + item.amount;

          if (!Number.isSafeInteger(nextTotal)) {
            const error = new Error(
              "Settlement total exceeds the safe monetary limit",
            );
            error.statusCode = 400;
            throw error;
          }

          return nextTotal;
        },
        0,
      );

      if (!isValidPaise(totalAmount) || totalAmount <= 0) {
        noEligiblePayments = true;
        return;
      }

      const [settlement] = await Settlement.create(
        [
          {
            host: hostId,
            event: eventId,
            payments: settlementPayments,
            totalAmount,
            status: "pending",
          },
        ],
        { session },
      );

      const paymentIds = eligiblePayments.map(
        (payment) => payment._id,
      );

      const paymentUpdate = await Payment.updateMany(
        {
          _id: { $in: paymentIds },
          status: {
            $in: ["successful", "partially_refunded"],
          },
          settlementStatus: { $in: ["available", null] },
          settlement: null,
        },
        {
          $set: {
            settlementStatus: "requested",
            settlement: settlement._id,
          },
        },
        { session },
      );

      if (
        paymentUpdate.modifiedCount !==
        eligiblePayments.length
      ) {
        const error = new Error(
          "Some payments could not be reserved for settlement. Please try again.",
        );
        error.statusCode = 409;
        throw error;
      }

      createdSettlement = settlement;
    });

    if (noEligiblePayments) {
      const error = new Error(
        "No eligible earnings available. Some payments may require refund or financial review.",
      );
      error.statusCode = 400;
      throw error;
    }

    return createdSettlement;
  } finally {
    await session.endSession();
  }
};

const getHostPaymentData = async (hostId) => {
  const events = await Event.find({ host: hostId })
    .select("eventName eventDate status")
    .lean();

  if (!events.length) {
    return {
      events: [],
      payments: [],
      bookings: [],
      eventMap: new Map(),
      bookingEventMap: new Map(),
    };
  }

  const eventMap = new Map(
    events.map((event) => [
      event._id.toString(),
      event,
    ]),
  );

  const bookings = await Booking.find({
    event: { $in: events.map((event) => event._id) },
    bookingStatus: "confirmed",
    paymentStatus: "successful",
  })
    .select("_id event")
    .lean();

  if (!bookings.length) {
    return {
      events,
      payments: [],
      bookings,
      eventMap,
      bookingEventMap: new Map(),
    };
  }

  const bookingIds = bookings.map(
    (booking) => booking._id,
  );

  const payments = await Payment.find({
    booking: { $in: bookingIds },
    status: {
      $in: [
        "successful",
        "partially_refunded",
        "refund_pending",
        "refund_review",
        "refund_failed",
        "refunded",
      ],
    },
  }).lean();

  const bookingEventMap = new Map(
    bookings.map((booking) => [
      booking._id.toString(),
      booking.event.toString(),
    ]),
  );

  return {
    events,
    payments,
    bookings,
    eventMap,
    bookingEventMap,
  };
};

const getRefundBookingIds = async (bookingIds) => {
  if (!bookingIds.length) {
    return new Set();
  }

  const unresolvedRefunds = await Refund.find({
    booking: { $in: bookingIds },
    status: {
      $in: unresolvedRefundStatuses,
    },
  })
    .select("booking")
    .lean();

  return new Set(
    unresolvedRefunds.map((refund) =>
      refund.booking.toString(),
    ),
  );
};

const classifyHostPayment = (
  payment,
  event,
  refundBookingIds,
) => {
  const settlementStatus = payment.settlementStatus;

  if (settlementStatus === "settled") {
    return "settled";
  }

  if (settlementStatus === "requested") {
    return "requested";
  }

  if (
    settlementStatus === "on_hold" ||
    refundBookingIds.has(payment.booking.toString()) ||
    refundRelatedPaymentStatuses.includes(payment.status)
  ) {
    return "on_hold";
  }

  if (!isValidPaymentFinancials(payment)) {
    return "on_hold";
  }

  if (payment.hostEarnings === 0) {
    return "zero";
  }

  if (
    event?.status === "completed" &&
    ["available", null, undefined].includes(
      settlementStatus,
    )
  ) {
    return "available";
  }

  return "upcoming";
};

export const getHostSettlementSummaryService = async (
  hostId,
) => {
  if (!mongoose.Types.ObjectId.isValid(hostId)) {
    const error = new Error("Invalid host ID");
    error.statusCode = 400;
    throw error;
  }

  const {
    payments,
    bookingEventMap,
    eventMap,
    bookings,
  } = await getHostPaymentData(hostId);

  const refundBookingIds = await getRefundBookingIds(
    bookings.map((booking) => booking._id),
  );

  const summary = {
    totalEarnings: 0,
    availableBalance: 0,
    pendingSettlement: 0,
    totalPaid: 0,
    onHold: 0,
    upcomingEarnings: 0,
    financialReviewCount: 0,
  };

  for (const payment of payments) {
    const eventId = bookingEventMap.get(
      payment.booking.toString(),
    );

    const event = eventMap.get(eventId);

    if (!isValidPaymentFinancials(payment)) {
      summary.financialReviewCount += 1;
      continue;
    }

    const amount = payment.hostEarnings;

    summary.totalEarnings += amount;

    const status = classifyHostPayment(
      payment,
      event,
      refundBookingIds,
    );

    if (status === "available") {
      summary.availableBalance += amount;
    } else if (status === "requested") {
      summary.pendingSettlement += amount;
    } else if (status === "settled") {
      summary.totalPaid += amount;
    } else if (status === "on_hold") {
      summary.onHold += amount;
    } else if (status === "upcoming") {
      summary.upcomingEarnings += amount;
    }
  }

  const totals = [
    summary.totalEarnings,
    summary.availableBalance,
    summary.pendingSettlement,
    summary.totalPaid,
    summary.onHold,
    summary.upcomingEarnings,
  ];

  if (!totals.every(Number.isSafeInteger)) {
    const error = new Error(
      "Settlement summary exceeds the safe monetary limit",
    );
    error.statusCode = 500;
    throw error;
  }

  return {
    ...summary,
    currency: "INR",
  };
};

export const getHostSettlementEventsService = async (
  hostId,
) => {
  if (!mongoose.Types.ObjectId.isValid(hostId)) {
    const error = new Error("Invalid host ID");
    error.statusCode = 400;
    throw error;
  }

  const {
    events,
    payments,
    bookings,
    eventMap,
    bookingEventMap,
  } = await getHostPaymentData(hostId);

  const refundBookingIds = await getRefundBookingIds(
    bookings.map((booking) => booking._id),
  );

  const eventResults = new Map();

  for (const event of events) {
    eventResults.set(event._id.toString(), {
      eventId: event._id,
      eventName: event.eventName,
      eventDate: event.eventDate,
      eventStatus: event.status,
      totalEarnings: 0,
      availableBalance: 0,
      pendingSettlement: 0,
      totalPaid: 0,
      onHold: 0,
      financialReviewCount: 0,
      canRequestSettlement: false,
    });
  }

  for (const payment of payments) {
    const eventId = bookingEventMap.get(
      payment.booking.toString(),
    );

    const event = eventMap.get(eventId);
    const result = eventResults.get(eventId);

    if (!result) {
      continue;
    }

    if (!isValidPaymentFinancials(payment)) {
      result.financialReviewCount += 1;
      continue;
    }

    const amount = payment.hostEarnings;

    result.totalEarnings += amount;

    const status = classifyHostPayment(
      payment,
      event,
      refundBookingIds,
    );

    if (status === "available") {
      result.availableBalance += amount;
    } else if (status === "requested") {
      result.pendingSettlement += amount;
    } else if (status === "settled") {
      result.totalPaid += amount;
    } else if (status === "on_hold") {
      result.onHold += amount;
    }
  }

  return Array.from(eventResults.values()).map((event) => ({
    ...event,
    canRequestSettlement:
      event.eventStatus === "completed" &&
      event.availableBalance > 0 &&
      event.financialReviewCount === 0,
  }));
};

export const getHostSettlementHistoryService = async (
  hostId,
) => {
  if (!mongoose.Types.ObjectId.isValid(hostId)) {
    const error = new Error("Invalid host ID");
    error.statusCode = 400;
    throw error;
  }

  return Settlement.find({ host: hostId })
    .populate("event", "eventName eventDate")
    .sort({ created_at: -1 })
    .lean();
};