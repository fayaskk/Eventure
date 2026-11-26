import mongoose from "mongoose";
import { Booking } from "../models/booking.model.js";
import { Payment } from "../models/payment.model.js";
import { WalletTransaction } from "../models/walletTransaction.model.js";
import { Ticket } from "../models/ticket.model.js";
import { Event } from "../models/event.model.js";

const validateObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid user ID");
    error.statusCode = 400;
    throw error;
  }
};

const validatePagination = (page, limit) => {
  if (
    !Number.isInteger(page) ||
    !Number.isInteger(limit) ||
    page < 1 ||
    limit < 1 ||
    limit > 50
  ) {
    const error = new Error("Invalid pagination parameters");
    error.statusCode = 400;
    throw error;
  }
};

const formatTransaction = ({
  id,
  type,
  category,
  amountPaise,
  status,
  description,
  reference,
  createdAt,
  paymentMethod,
}) => ({
  id,
  type,
  category,
  amountPaise,
  amount: amountPaise / 100,
  currency: "INR",
  status,
  description,
  reference,
  paymentMethod,
  createdAt,
});

export const getTransactionHistoryService = async (
  userId,
  page = 1,
  limit = 10,
  type = "all",
) => {
  validateObjectId(userId);
  validatePagination(page, limit);

  const allowedTypes = [
    "all",
    "payments",
    "credits",
    "debits",
    "refunds",
    "failed",
  ];

  if (!allowedTypes.includes(type)) {
    const error = new Error("Invalid transaction type");
    error.statusCode = 400;
    throw error;
  }

  const bookings = await Booking.find({ user: userId })
    .select("_id bookingReference event totalAmount bookingStatus paymentStatus")
    .lean();

  const bookingIds = bookings.map((booking) => booking._id);

  const eventIds = [
    ...new Set(
      bookings
        .map((booking) => booking.event?.toString())
        .filter(Boolean),
    ),
  ];

  const [payments, walletTransactions, tickets, events] =
    await Promise.all([
      Payment.find({ booking: { $in: bookingIds } })
        .sort({ created_at: -1 })
        .lean(),

      WalletTransaction.find({ user: userId })
        .sort({ created_at: -1 })
        .lean(),

      Ticket.find({
        booking: { $in: bookingIds },
        refundStatus: { $in: ["pending", "processed", "failed"] },
      })
        .sort({ created_at: -1 })
        .lean(),

      Event.find({ _id: { $in: eventIds } })
        .select("_id eventName")
        .lean(),
    ]);

  const bookingMap = new Map(
    bookings.map((booking) => [
      booking._id.toString(),
      booking,
    ]),
  );

  const eventMap = new Map(
    events.map((event) => [
      event._id.toString(),
      event.eventName,
    ]),
  );

  const transactions = [];

  for (const payment of payments) {
    const booking = bookingMap.get(payment.booking.toString());

    if (!booking) continue;

    transactions.push(
      formatTransaction({
        id: payment._id,
        type: "payment",
        category: "payments",
        amountPaise: payment.amount,
        status: payment.status,
        description: "Event ticket payment",
        reference: {
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          eventName: eventMap.get(booking.event?.toString()) || "Event",
        },
        paymentMethod: "Razorpay",
        createdAt: payment.created_at,
      }),
    );
  }

  for (const transaction of walletTransactions) {
    transactions.push(
      formatTransaction({
        id: transaction._id,
        type: transaction.type,
        category: transaction.type === "credit" ? "credits" : "debits",
        amountPaise: transaction.amountPaise,
        status: "successful",
        description: transaction.description,
        reference: {
          referenceType: transaction.referenceType,
          referenceId: transaction.referenceId,
        },
        paymentMethod: "Wallet",
        createdAt: transaction.created_at,
      }),
    );
  }

  for (const ticket of tickets) {
    const booking = bookingMap.get(ticket.booking.toString());

    if (!booking) continue;

    const amountPaise = Math.round(Number(ticket.price) * 100);

    transactions.push(
      formatTransaction({
        id: ticket._id,
        type: "refund",
        category: "refunds",
        amountPaise,
        status: ticket.refundStatus,
        description: "Ticket refund",
        reference: {
          ticketId: ticket._id,
          bookingId: booking._id,
          bookingReference: booking.bookingReference,
          eventName: eventMap.get(booking.event?.toString()) || "Event",
        },
        paymentMethod: "Razorpay",
        createdAt: ticket.updated_at || ticket.created_at,
      }),
    );
  }

  transactions.sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime(),
  );

  const filteredTransactions = transactions.filter((transaction) => {
    if (type === "all") return true;

    if (type === "failed") {
      return [
        "failed",
        "refund_failed",
      ].includes(transaction.status);
    }

    return transaction.category === type;
  });

  const totalTransactions = filteredTransactions.length;
  const totalPages = Math.ceil(totalTransactions / limit);
  const skip = (page - 1) * limit;

  const paginatedTransactions = filteredTransactions.slice(
    skip,
    skip + limit,
  );

  const summary = transactions.reduce(
    (result, transaction) => {
      if (
        transaction.category === "payments" &&
        transaction.status === "successful"
      ) {
        result.totalPaymentsPaise += transaction.amountPaise;
      }

      if (
        transaction.category === "credits" &&
        transaction.status === "successful"
      ) {
        result.totalCreditsPaise += transaction.amountPaise;
      }

      if (
        transaction.category === "debits" &&
        transaction.status === "successful"
      ) {
        result.totalDebitsPaise += transaction.amountPaise;
      }

      if (
        transaction.category === "refunds" &&
        transaction.status === "processed"
      ) {
        result.totalRefundsPaise += transaction.amountPaise;
      }

      return result;
    },
    {
      totalPaymentsPaise: 0,
      totalCreditsPaise: 0,
      totalDebitsPaise: 0,
      totalRefundsPaise: 0,
    },
  );

  return {
    summary: {
      totalPayments: summary.totalPaymentsPaise / 100,
      totalCredits: summary.totalCreditsPaise / 100,
      totalDebits: summary.totalDebitsPaise / 100,
      totalRefunds: summary.totalRefundsPaise / 100,
      totalTransactions: transactions.length,
    },

    transactions: paginatedTransactions,

    pagination: {
      currentPage: page,
      totalPages,
      totalTransactions,
      limit,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
};