import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";
import process from "process";

import { Booking } from "../models/booking.model.js";
import { User } from "../models/user.model.js";
import { Payment } from "../models/payment.model.js";
import { Event } from "../models/event.model.js";
import { Ticket } from "../models/ticket.model.js";
import { Discount } from "../models/discount.model.js";
import { dispatchNotificationService } from "./notification-dispatcher.service.js";
import { allocatePaymentToTickets } from "../utils/paymentAllocation.js";
import { Refund } from "../models/refund.model.js";
import { createRefundReconciliationService } from "../utils/refundReconciliationFactory.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createRazorpayOrderService = async (userId, bookingId) => {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(bookingId)
  ) {
    const error = new Error("Invalid user or booking ID");
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findById(bookingId);

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.user.toString() !== userId.toString()) {
    const error = new Error("You are not authorized to pay for this booking");
    error.statusCode = 403;
    throw error;
  }

  if (
    booking.bookingStatus !== "pending" ||
    !["pending", "failed"].includes(booking.paymentStatus) ||
    booking.paymentExpiresAt <= new Date()
  ) {
    const error = new Error("Booking is no longer available for payment");
    error.statusCode = 409;
    throw error;
  }

  const existingPayment = await Payment.findOne({
    booking: booking._id,
  });

  if (existingPayment?.status === "successful") {
    const error = new Error("Payment has already been completed");
    error.statusCode = 409;
    throw error;
  }

  if (existingPayment?.status === "created") {
    return {
      payment: existingPayment,
      razorpayOrderId: existingPayment.razorpayOrderId,
      amount: existingPayment.amount,
      currency: existingPayment.currency,
    };
  }

  const amount = Math.round(booking.totalAmount * 100);

  const order = await razorpay.orders.create({
    amount,
    currency: "INR",
    receipt: booking.bookingReference,
  });

  let payment;

  if (existingPayment) {
    existingPayment.razorpayOrderId = order.id;
    existingPayment.razorpayPaymentId = undefined;
    existingPayment.amount = order.amount;
    existingPayment.currency = order.currency;
    existingPayment.status = "created";
    existingPayment.failureReason = undefined;

    payment = await existingPayment.save();
  } else {
    payment = await Payment.create({
      booking: booking._id,
      razorpayOrderId: order.id,
      amount: order.amount,
      currency: order.currency,
      status: "created",
    });
  }

  return {
    payment,
    razorpayOrderId: order.id,
    amount: order.amount,
    currency: order.currency,
  };
};

const confirmCapturedPaymentTransaction = async ({
  paymentId,
  razorpayOrderId,
  razorpayPaymentId,
}) => {
  const session = await mongoose.startSession();

  try {
    let updatedPayment;
    let updatedBooking;
    let alreadyProcessed = false;

    await session.withTransaction(async () => {
      const currentPayment = await Payment.findById(paymentId).session(session);

      if (!currentPayment) {
        const error = new Error("Payment record not found");
        error.statusCode = 404;
        throw error;
      }

      if (currentPayment.razorpayOrderId !== razorpayOrderId) {
        const error = new Error("Payment order mismatch");
        error.statusCode = 409;
        throw error;
      }

      if (currentPayment.status === "successful") {
        if (currentPayment.razorpayPaymentId !== razorpayPaymentId) {
          const error = new Error(
            "Payment has already been processed with another payment ID",
          );
          error.statusCode = 409;
          throw error;
        }

        updatedPayment = currentPayment;

        updatedBooking = await Booking.findById(currentPayment.booking).session(
          session,
        );

        alreadyProcessed = true;
        return;
      }

      const currentBooking = await Booking.findById(
        currentPayment.booking,
      ).session(session);

      if (!currentBooking) {
        const error = new Error("Booking not found");
        error.statusCode = 404;
        throw error;
      }

      if (
        currentBooking.bookingStatus !== "pending" ||
        currentBooking.paymentStatus !== "pending" ||
        currentBooking.paymentExpiresAt <= new Date()
      ) {
        const error = new Error(
          "Booking has expired or is no longer available. Any captured payment requires reconciliation.",
        );
        error.statusCode = 409;
        throw error;
      }

      const expectedAmountPaise = Math.round(currentBooking.totalAmount * 100);

      if (
        !Number.isSafeInteger(currentPayment.amount) ||
        currentPayment.amount !== expectedAmountPaise
      ) {
        const error = new Error(
          "Payment amount does not match the booking amount.",
        );
        error.statusCode = 409;
        throw error;
      }

      const event = await Event.findOne({
        _id: currentBooking.event,
        status: "approved",
      }).session(session);

      if (!event) {
        const error = new Error("Event not found or is no longer approved");
        error.statusCode = 409;
        throw error;
      }

      for (const bookedTicket of currentBooking.tickets) {
        const eventTicket = event.tickets.id(bookedTicket.ticketId);

        if (!eventTicket) {
          const error = new Error(
            `Ticket ${bookedTicket.ticketName} no longer exists`,
          );
          error.statusCode = 409;
          throw error;
        }

        if ((eventTicket.reserved ?? 0) < bookedTicket.quantity) {
          const error = new Error(
            `Reserved quantity is insufficient for ${bookedTicket.ticketName}`,
          );
          error.statusCode = 409;
          throw error;
        }

        eventTicket.reserved -= bookedTicket.quantity;
        eventTicket.sold = (eventTicket.sold ?? 0) + bookedTicket.quantity;
      }

      await event.save({ session });

      if (currentBooking.discount?.discountId) {
        if (currentBooking.discountReservationStatus !== "reserved") {
          const error = new Error("Coupon reservation is no longer available");
          error.statusCode = 409;
          throw error;
        }

        const discountUpdate = await Discount.updateOne(
          {
            _id: currentBooking.discount.discountId,
            reservedCount: { $gt: 0 },
          },
          {
            $inc: {
              reservedCount: -1,
              usedCount: 1,
            },
          },
          { session },
        );

        if (discountUpdate.modifiedCount !== 1) {
          const error = new Error("Unable to finalize coupon usage");
          error.statusCode = 409;
          throw error;
        }

        currentBooking.discountReservationStatus = "consumed";
      }

      const commissionPercent = Number(
        process.env.PLATFORM_COMMISSION_PERCENT || 10,
      );

      if (
        !Number.isFinite(commissionPercent) ||
        commissionPercent < 0 ||
        commissionPercent > 100
      ) {
        const error = new Error("Invalid platform commission configuration");
        error.statusCode = 500;
        throw error;
      }

      const allocatedTickets = allocatePaymentToTickets(
        currentBooking.tickets,
        currentPayment.amount,
        commissionPercent,
      );

      const platformFee = allocatedTickets.reduce(
        (total, ticket) => total + ticket.platformFeePaise,
        0,
      );

      const hostEarnings = allocatedTickets.reduce(
        (total, ticket) => total + ticket.hostEarningsPaise,
        0,
      );

      const allocatedPaymentAmount = allocatedTickets.reduce(
        (total, ticket) => total + ticket.paidAmountPaise,
        0,
      );

      if (
        !Number.isSafeInteger(platformFee) ||
        !Number.isSafeInteger(hostEarnings) ||
        !Number.isSafeInteger(allocatedPaymentAmount) ||
        allocatedPaymentAmount !== currentPayment.amount ||
        platformFee + hostEarnings !== currentPayment.amount
      ) {
        const error = new Error("Payment financial allocation mismatch");
        error.statusCode = 500;
        throw error;
      }

      currentPayment.platformCommissionPercent = commissionPercent;
      currentPayment.platformFee = platformFee;
      currentPayment.hostEarnings = hostEarnings;
      currentPayment.razorpayPaymentId = razorpayPaymentId;
      currentPayment.status = "successful";
      currentPayment.failureReason = undefined;

      await currentPayment.save({ session });

      const individualTickets = allocatedTickets.map((ticket) => ({
        booking: currentBooking._id,
        event: currentBooking.event,
        ticketTypeId: ticket.ticketTypeId,
        ticketName: ticket.ticketName,
        price: ticket.originalPricePaise / 100,
        paidAmountPaise: ticket.paidAmountPaise,
        platformFeePaise: ticket.platformFeePaise,
        hostEarningsPaise: ticket.hostEarningsPaise,
        owner: currentBooking.user,
      }));

      if (individualTickets.length > 0) {
        await Ticket.insertMany(individualTickets, { session });
      }

      currentBooking.bookingStatus = "confirmed";
      currentBooking.paymentStatus = "successful";

      await currentBooking.save({ session });

      updatedPayment = currentPayment;
      updatedBooking = currentBooking;
    });

    if (updatedBooking?.bookingStatus === "confirmed") {
      try {
        const eventDetails = await Event.findById(updatedBooking.event)
          .select("eventName host")
          .lean();

        if (eventDetails) {
          const [customer, host] = await Promise.all([
            User.findById(updatedBooking.user).select("role"),
            User.findById(eventDetails.host).select("role"),
          ]);

          const notificationTasks = [];

          if (customer) {
            notificationTasks.push(
              dispatchNotificationService({
                recipient: customer._id,
                recipientRole: customer.role,
                title: "Booking Confirmed!",
                message: `Your booking for ${eventDetails.eventName} has been confirmed. Your tickets are ready!`,
                type: "booking",
                relatedEntity: {
                  entityType: "Booking",
                  entityId: updatedBooking._id,
                },
                actionUrl: "/user/bookings",
                idempotencyKey: `booking-confirmed-customer:${updatedBooking._id}`,
              }),
            );
          }

          if (host) {
            notificationTasks.push(
              dispatchNotificationService({
                recipient: host._id,
                recipientRole: host.role,
                title: "New Booking Received!",
                message: `A new booking has been confirmed for your event "${eventDetails.eventName}".`,
                type: "booking",
                relatedEntity: {
                  entityType: "Booking",
                  entityId: updatedBooking._id,
                },
                actionUrl: "/host/bookings",
                idempotencyKey: `booking-confirmed-host:${updatedBooking._id}`,
              }),
            );
          }

          const results = await Promise.allSettled(notificationTasks);

          results.forEach((result) => {
            if (result.status === "rejected") {
              console.error(
                "Booking notification creation failed:",
                result.reason,
              );
            }
          });
        }
      } catch (error) {
        console.error("Booking notification integration failed:", error);
      }
    }

    return {
      payment: updatedPayment,
      booking: updatedBooking,
      alreadyProcessed,
    };
  } finally {
    await session.endSession();
  }
};

export const reconcileCapturedRazorpayPaymentService = async ({
  razorpayPaymentId,
  razorpayOrderId,
}) => {
  if (!razorpayPaymentId || !razorpayOrderId) {
    const error = new Error("Razorpay payment ID and order ID are required.");
    error.statusCode = 400;
    throw error;
  }

  const payment = await Payment.findOne({
    razorpayOrderId,
  });

  if (!payment) {
    const error = new Error("Payment record not found.");
    error.statusCode = 404;
    throw error;
  }

  const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);

  if (
    razorpayPayment.id !== razorpayPaymentId ||
    razorpayPayment.order_id !== razorpayOrderId ||
    razorpayPayment.status !== "captured" ||
    razorpayPayment.amount !== payment.amount ||
    razorpayPayment.currency !== payment.currency
  ) {
    const error = new Error("Razorpay payment details could not be verified.");
    error.statusCode = 409;
    throw error;
  }

  return await confirmCapturedPaymentTransaction({
    paymentId: payment._id,
    razorpayOrderId,
    razorpayPaymentId,
  });
};

export const verifyRazorpayPaymentService = async (
  userId,
  { razorpayPaymentId, razorpayOrderId, razorpaySignature },
) => {
  if (!razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
    const error = new Error("Payment verification data is incomplete");
    error.statusCode = 400;
    throw error;
  }

  if (!/^[a-f0-9]{64}$/i.test(razorpaySignature)) {
    const error = new Error("Invalid payment signature format");
    error.statusCode = 400;
    throw error;
  }

  const payment = await Payment.findOne({ razorpayOrderId });

  if (!payment) {
    const error = new Error("Payment record not found");
    error.statusCode = 404;
    throw error;
  }

  const booking = await Booking.findById(payment.booking);

  if (!booking) {
    const error = new Error("Booking not found");
    error.statusCode = 404;
    throw error;
  }

  if (booking.user.toString() !== userId.toString()) {
    const error = new Error("You are not authorized to verify this payment");
    error.statusCode = 403;
    throw error;
  }

  const generatedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  const signatureBuffer = Buffer.from(generatedSignature, "hex");
  const providedSignatureBuffer = Buffer.from(razorpaySignature, "hex");

  if (
    signatureBuffer.length !== providedSignatureBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, providedSignatureBuffer)
  ) {
    const error = new Error("Invalid payment signature");
    error.statusCode = 400;
    throw error;
  }

  if (payment.status === "successful") {
    if (payment.razorpayPaymentId !== razorpayPaymentId) {
      const error = new Error(
        "Payment record does not match the supplied payment ID",
      );
      error.statusCode = 409;
      throw error;
    }

    return {
      payment,
      booking,
      alreadyProcessed: true,
    };
  }

  const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);

  if (
    razorpayPayment.order_id !== razorpayOrderId ||
    razorpayPayment.status !== "captured" ||
    razorpayPayment.amount !== payment.amount ||
    razorpayPayment.currency !== payment.currency
  ) {
    const error = new Error("Razorpay payment details could not be verified");
    error.statusCode = 400;
    throw error;
  }

  return await confirmCapturedPaymentTransaction({
    paymentId: payment._id,
    razorpayOrderId,
    razorpayPaymentId,
  });
};

export const handleRazorpayPaymentFailureService = async (
  userId,
  { razorpayOrderId, razorpayPaymentId, failureReason },
) => {
  if (!razorpayOrderId) {
    const error = new Error("Razorpay order ID is required");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  try {
    let result;

    await session.withTransaction(async () => {
      const payment = await Payment.findOne({
        razorpayOrderId,
      }).session(session);

      if (!payment) {
        const error = new Error("Payment record not found");
        error.statusCode = 404;
        throw error;
      }

      const booking = await Booking.findById(payment.booking).session(session);

      if (!booking) {
        const error = new Error("Booking not found");
        error.statusCode = 404;
        throw error;
      }

      if (booking.user.toString() !== userId.toString()) {
        const error = new Error(
          "You are not authorized to update this payment",
        );
        error.statusCode = 403;
        throw error;
      }

      if (payment.status === "successful") {
        const error = new Error("Payment is already successful");
        error.statusCode = 409;
        throw error;
      }

      if (
        booking.bookingStatus !== "pending" ||
        booking.paymentStatus !== "pending" ||
        booking.paymentExpiresAt <= new Date()
      ) {
        const error = new Error(
          "Booking has expired or is no longer available",
        );
        error.statusCode = 409;
        throw error;
      }

      payment.razorpayPaymentId = razorpayPaymentId || undefined;
      payment.status = "failed";
      payment.failureReason = failureReason || "Payment failed";

      await payment.save({ session });

      result = {
        payment,
        booking,
      };
    });

    return result;
  } finally {
    await session.endSession();
  }
};

const initiateRazorpayRefund = async (ticketId, userId = null) => {
  if (!mongoose.Types.ObjectId.isValid(ticketId)) {
    const error = new Error("Invalid ticket ID.");
    error.statusCode = 400;
    throw error;
  }

  const initiationToken = crypto.randomUUID();
  const session = await mongoose.startSession();

  let refundRecord;

  try {
    await session.withTransaction(async () => {
      const now = new Date();

      const ticket = await Ticket.findById(ticketId).session(session);

      if (!ticket) {
        const error = new Error("Ticket not found.");
        error.statusCode = 404;
        throw error;
      }

      if (userId && ticket.owner.toString() !== userId.toString()) {
        const error = new Error(
          "You are not authorized to request a refund for this ticket.",
        );
        error.statusCode = 403;
        throw error;
      }

      if (
        ticket.status !== "valid" ||
        ticket.cancellationStatus !== "pending" ||
        !ticket.cancellationExpiresAt ||
        ticket.cancellationExpiresAt > now
      ) {
        const error = new Error(
          "Ticket is not eligible for refund processing.",
        );
        error.statusCode = 409;
        throw error;
      }

      if (ticket.attendanceStatus === "checked_in") {
        const error = new Error("Checked-in tickets cannot be refunded.");
        error.statusCode = 409;
        throw error;
      }

      if (ticket.refundStatus !== "none") {
        const error = new Error(
          "Ticket already has a refund attempt or requires investigation.",
        );
        error.statusCode = 409;
        throw error;
      }

      if (
        !Number.isSafeInteger(ticket.paidAmountPaise) ||
        ticket.paidAmountPaise <= 0
      ) {
        const error = new Error(
          "Valid paid amount is unavailable for this ticket.",
        );
        error.statusCode = 409;
        throw error;
      }

      if (
        !Number.isSafeInteger(ticket.platformFeePaise) ||
        !Number.isSafeInteger(ticket.hostEarningsPaise) ||
        ticket.platformFeePaise < 0 ||
        ticket.hostEarningsPaise < 0
      ) {
        const error = new Error(
          "Ticket financial allocation is missing or invalid. Manual reconciliation is required.",
        );
        error.statusCode = 409;
        throw error;
      }

      const originalAllocation =
        ticket.platformFeePaise + ticket.hostEarningsPaise;

      if (
        !Number.isSafeInteger(originalAllocation) ||
        originalAllocation !== ticket.paidAmountPaise
      ) {
        const error = new Error(
          "Ticket financial allocation does not match its paid amount.",
        );
        error.statusCode = 409;
        throw error;
      }

      const cancellationFeePercent = ticket.cancellationPolicy?.feePercent;

      const policyWindow = ticket.cancellationPolicy?.window;

      const validPolicy =
        (policyWindow === "more_than_3_days" && cancellationFeePercent === 0) ||
        (policyWindow === "1_to_3_days" && cancellationFeePercent === 20);

      if (!validPolicy) {
        const error = new Error(
          "Cancellation policy snapshot is missing or inconsistent.",
        );
        error.statusCode = 409;
        throw error;
      }

      const payment = await Payment.findOne({
        booking: ticket.booking,
        razorpayPaymentId: {
          $exists: true,
          $ne: null,
        },
      }).session(session);

      if (
        !payment ||
        typeof payment.razorpayPaymentId !== "string" ||
        !payment.razorpayPaymentId ||
        !Number.isSafeInteger(payment.amount) ||
        payment.amount <= 0 ||
        payment.currency !== "INR" ||
        !["successful", "refund_pending", "partially_refunded"].includes(
          payment.status,
        )
      ) {
        const error = new Error(
          "A valid captured payment record was not found.",
        );
        error.statusCode = 409;
        throw error;
      }

      if (ticket.paidAmountPaise > payment.amount) {
        const error = new Error(
          "Ticket paid amount exceeds the captured payment amount.",
        );
        error.statusCode = 409;
        throw error;
      }

      if (
        ["requested", "settled"].includes(payment.settlementStatus) ||
        payment.settlement
      ) {
        const error = new Error(
          "This payment is already associated with a settlement. Refund processing requires settlement reconciliation.",
        );
        error.statusCode = 409;
        throw error;
      }

      const paidAmountPaise = ticket.paidAmountPaise;

      const cancellationFeePaise = Math.round(
        (paidAmountPaise * cancellationFeePercent) / 100,
      );

      const refundAmountPaise = paidAmountPaise - cancellationFeePaise;

      if (
        !Number.isSafeInteger(cancellationFeePaise) ||
        cancellationFeePaise < 0 ||
        cancellationFeePaise > paidAmountPaise ||
        !Number.isSafeInteger(refundAmountPaise) ||
        refundAmountPaise <= 0 ||
        paidAmountPaise !== cancellationFeePaise + refundAmountPaise
      ) {
        const error = new Error("Calculated refund amount is invalid.");
        error.statusCode = 409;
        throw error;
      }

      const lockedPayment = await Payment.findOneAndUpdate(
        {
          _id: payment._id,
          status: {
            $in: ["successful", "refund_pending", "partially_refunded"],
          },
          settlementStatus: {
            $nin: ["requested", "settled"],
          },
          settlement: null,
        },
        {
          $set: {
            status: "refund_pending",
            settlementStatus: "on_hold",
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!lockedPayment) {
        const error = new Error(
          "Payment is currently unavailable for refund processing or settlement.",
        );
        error.statusCode = 409;
        throw error;
      }

      const existingRefunds = await Refund.find({
        payment: payment._id,
        status: {
          $in: [
            "successful",
            "pending",
            "processing",
            "requires_reconciliation",
          ],
        },
      }).session(session);

      let alreadyCommittedPaise = 0;

      for (const refund of existingRefunds) {
        if (!Number.isSafeInteger(refund.amount) || refund.amount <= 0) {
          const error = new Error(
            "An existing refund contains an invalid amount. Manual reconciliation is required.",
          );
          error.statusCode = 409;
          throw error;
        }

        alreadyCommittedPaise += refund.amount;

        if (!Number.isSafeInteger(alreadyCommittedPaise)) {
          const error = new Error(
            "Existing refund total exceeds the safe integer limit.",
          );
          error.statusCode = 409;
          throw error;
        }
      }

      const maximumRefundablePaise = payment.amount - alreadyCommittedPaise;

      if (
        alreadyCommittedPaise > payment.amount ||
        refundAmountPaise > maximumRefundablePaise
      ) {
        const error = new Error(
          "Refund amount exceeds the remaining refundable payment amount.",
        );
        error.statusCode = 409;
        throw error;
      }

      const claimedTicket = await Ticket.findOneAndUpdate(
        {
          _id: ticket._id,
          status: "valid",
          cancellationStatus: "pending",
          cancellationExpiresAt: {
            $lte: now,
          },
          attendanceStatus: "not_checked_in",
          refundStatus: "none",
        },
        {
          $set: {
            refundStatus: "pending",
          },
        },
        {
          new: true,
          session,
        },
      );

      if (!claimedTicket) {
        const error = new Error("Ticket is already being processed.");
        error.statusCode = 409;
        throw error;
      }

      const [createdRefund] = await Refund.create(
        [
          {
            ticket: ticket._id,
            booking: ticket.booking,
            payment: payment._id,
            paidAmountPaise,
            cancellationFeePercent,
            cancellationFeePaise,
            amount: refundAmountPaise,
            policyWindow,
            status: "pending",
            reason: "User requested ticket cancellation",
            cancellationRequestedAt: ticket.cancellationRequestedAt,
            initiationStartedAt: now,
            initiationToken,
          },
        ],
        { session },
      );

      refundRecord = {
        id: createdRefund._id,
        paymentDocumentId: payment._id,
        razorpayPaymentId: payment.razorpayPaymentId,
        amount: refundAmountPaise,
        ticketId: ticket._id,
        bookingId: ticket.booking,
      };
    });
  } finally {
    await session.endSession();
  }

  if (!refundRecord) {
    throw new Error("Unable to create refund request.");
  }

  let razorpayRefund;

  try {
    razorpayRefund = await razorpay.payments.refund(
      refundRecord.razorpayPaymentId,
      {
        amount: refundRecord.amount,
        receipt: refundRecord.id.toString(),
        notes: {
          ticketId: refundRecord.ticketId.toString(),
          bookingId: refundRecord.bookingId.toString(),
          refundRecordId: refundRecord.id.toString(),
          reason: "User requested ticket cancellation",
        },
      },
    );

    const providerRefundId = razorpayRefund?.id;

    if (!providerRefundId) {
      throw new Error("Razorpay response did not contain a refund ID.");
    }

    const updateSession = await mongoose.startSession();

    try {
      await updateSession.withTransaction(async () => {
        const currentRefund = await Refund.findById(refundRecord.id).session(
          updateSession,
        );

        if (!currentRefund) {
          const error = new Error("Refund record could not be found.");
          error.statusCode = 404;
          throw error;
        }

        if (["successful", "failed"].includes(currentRefund.status)) {
          currentRefund.initiationStartedAt = null;
          currentRefund.initiationToken = null;

          await currentRefund.save({
            session: updateSession,
          });

          return;
        }

        if (
          !["pending", "processing", "requires_reconciliation"].includes(
            currentRefund.status,
          )
        ) {
          const error = new Error(
            `Unexpected refund state: ${currentRefund.status}`,
          );
          error.statusCode = 409;
          throw error;
        }

        if (currentRefund.initiationToken !== initiationToken) {
          const error = new Error(
            "Refund initiation ownership has changed. Reconciliation is required.",
          );
          error.statusCode = 409;
          throw error;
        }

        if (
          currentRefund.razorpayRefundId &&
          currentRefund.razorpayRefundId !== providerRefundId
        ) {
          const error = new Error(
            "Refund is already associated with a different provider refund ID.",
          );
          error.statusCode = 409;
          throw error;
        }

        currentRefund.razorpayRefundId = providerRefundId;
        currentRefund.providerStatus = razorpayRefund.status;

        if (currentRefund.status === "pending") {
          currentRefund.status = "processing";
        }

        currentRefund.initiatedAt = currentRefund.initiatedAt || new Date();

        currentRefund.initiationStartedAt = null;
        currentRefund.initiationToken = null;

        await currentRefund.save({
          session: updateSession,
        });

        const currentTicket = await Ticket.findById(
          refundRecord.ticketId,
        ).session(updateSession);

        if (!currentTicket) {
          const error = new Error("Ticket could not be found.");
          error.statusCode = 404;
          throw error;
        }

        if (currentTicket.status === "refunded") {
          return;
        }

        if (
          currentTicket.razorpayRefundId &&
          currentTicket.razorpayRefundId !== providerRefundId
        ) {
          const error = new Error(
            "Ticket is associated with another provider refund ID.",
          );
          error.statusCode = 409;
          throw error;
        }

        if (
          ["pending", "processing", "requires_reconciliation"].includes(
            currentTicket.refundStatus,
          )
        ) {
          currentTicket.refundStatus = "processing";
          currentTicket.razorpayRefundId = providerRefundId;

          await currentTicket.save({
            session: updateSession,
          });
        }
      });
    } finally {
      await updateSession.endSession();
    }

    const latestRefund = await Refund.findById(refundRecord.id);

    return {
      refundId: refundRecord.id,
      razorpayRefundId: providerRefundId,
      amount: refundRecord.amount,
      status: latestRefund?.status || "requires_reconciliation",
      providerStatus: razorpayRefund.status,
    };
  } catch (error) {
    console.error("Razorpay refund initiation error:", error);

    const reconciliationSession = await mongoose.startSession();

    try {
      await reconciliationSession.withTransaction(async () => {
        const currentRefund = await Refund.findById(refundRecord.id).session(
          reconciliationSession,
        );

        if (!currentRefund) {
          return;
        }

        if (["successful", "failed"].includes(currentRefund.status)) {
          currentRefund.initiationStartedAt = null;
          currentRefund.initiationToken = null;

          await currentRefund.save({
            session: reconciliationSession,
          });

          return;
        }

        if (
          razorpayRefund?.id &&
          currentRefund.razorpayRefundId &&
          currentRefund.razorpayRefundId !== razorpayRefund.id
        ) {
          currentRefund.status = "requires_reconciliation";
          currentRefund.failureReason =
            "Conflicting Razorpay refund IDs were returned.";
        } else {
          if (razorpayRefund?.id) {
            currentRefund.razorpayRefundId = razorpayRefund.id;
            currentRefund.providerStatus = razorpayRefund.status;
          }

          currentRefund.status = "requires_reconciliation";
          currentRefund.failureReason =
            error.message || "Unknown Razorpay refund outcome.";
        }

        currentRefund.initiationStartedAt = null;
        currentRefund.initiationToken = null;

        await currentRefund.save({
          session: reconciliationSession,
        });

        await Ticket.updateOne(
          {
            _id: refundRecord.ticketId,
            refundStatus: {
              $in: ["pending", "processing", "requires_reconciliation"],
            },
          },
          {
            $set: {
              refundStatus: "requires_reconciliation",
              ...(razorpayRefund?.id
                ? {
                    razorpayRefundId: razorpayRefund.id,
                  }
                : {}),
            },
          },
          {
            session: reconciliationSession,
          },
        );

        await Payment.updateOne(
          {
            _id: refundRecord.paymentDocumentId,
          },
          {
            $set: {
              status: "refund_review",
              settlementStatus: "on_hold",
            },
          },
          {
            session: reconciliationSession,
          },
        );
      });
    } finally {
      await reconciliationSession.endSession();
    }

    const reconciliationError = new Error(
      "Refund outcome is uncertain. Automatic reconciliation is required.",
    );

    reconciliationError.statusCode = 202;
    throw reconciliationError;
  }
};

export const initiateRazorpayRefundService = async (ticketId, userId) => {
  if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Authenticated user ID is required.");
    error.statusCode = 401;
    throw error;
  }

  return initiateRazorpayRefund(ticketId, userId);
};

export const initiateScheduledRazorpayRefundService = async (ticketId) => {
  return initiateRazorpayRefund(ticketId);
};

export const handleRazorpayRefundWebhookService = async (
  event,
  { reconciliationToken = null } = {},
) => {
  if (!["refund.processed", "refund.failed"].includes(event.event)) {
    return { ignored: true };
  }

  const refundEntity = event.payload?.refund?.entity;

  if (
    !refundEntity?.id ||
    !refundEntity?.payment_id ||
    !Number.isSafeInteger(refundEntity.amount) ||
    refundEntity.amount <= 0 ||
    refundEntity.currency !== "INR"
  ) {
    const error = new Error("Invalid refund details in webhook payload.");
    error.statusCode = 400;
    throw error;
  }

  const expectedProviderStatus =
    event.event === "refund.processed" ? "processed" : "failed";

  if (refundEntity.status && refundEntity.status !== expectedProviderStatus) {
    const error = new Error(
      "Refund event and Razorpay refund status do not match.",
    );
    error.statusCode = 409;
    throw error;
  }

  const refundId = refundEntity.id;
  const razorpayPaymentId = refundEntity.payment_id;
  const refundAmountPaise = refundEntity.amount;
  const receipt = refundEntity.receipt;

  const isValidPaise = (value) => Number.isSafeInteger(value) && value >= 0;

  const calculatePercentagePaise = (amount, percentage) =>
    Number((BigInt(amount) * BigInt(percentage) + 50n) / 100n);

  const session = await mongoose.startSession();

  try {
    let result = { ignored: true };

    await session.withTransaction(async () => {
      let refund = await Refund.findOne({
        razorpayRefundId: refundId,
      }).session(session);

      let receiptRefund = null;

      if (receipt) {
        if (!mongoose.Types.ObjectId.isValid(receipt)) {
          const error = new Error(
            "Invalid refund receipt supplied by Razorpay.",
          );
          error.statusCode = 409;
          throw error;
        }

        receiptRefund = await Refund.findById(receipt).session(session);

        if (!receiptRefund) {
          const error = new Error(
            "Refund record referenced by the Razorpay receipt was not found.",
          );
          error.statusCode = 404;
          throw error;
        }

        if (refund && !refund._id.equals(receiptRefund._id)) {
          const error = new Error(
            "Razorpay refund ID and receipt identify different refund records.",
          );
          error.statusCode = 409;
          throw error;
        }

        if (!refund) {
          refund = receiptRefund;
        }
      }

      if (!refund) {
        const error = new Error(
          "Refund record not found using refund ID or receipt.",
        );
        error.statusCode = 404;
        throw error;
      }

      if (
        reconciliationToken &&
        refund.reconciliationToken !== reconciliationToken
      ) {
        result = {
          ignored: true,
          reason: "Reconciliation lock is no longer owned by this worker.",
          refundId,
        };
        return;
      }

      if (
        !isValidPaise(refund.paidAmountPaise) ||
        !isValidPaise(refund.cancellationFeePaise) ||
        !isValidPaise(refund.amount) ||
        refund.paidAmountPaise <= 0 ||
        refund.amount <= 0 ||
        refund.paidAmountPaise !==
          refund.cancellationFeePaise + refund.amount ||
        ![0, 20].includes(refund.cancellationFeePercent) ||
        !["more_than_3_days", "1_to_3_days"].includes(refund.policyWindow)
      ) {
        const error = new Error(
          "Stored refund financial allocation is inconsistent.",
        );
        error.statusCode = 409;
        throw error;
      }

      const expectedCancellationFee = calculatePercentagePaise(
        refund.paidAmountPaise,
        refund.cancellationFeePercent,
      );

      if (
        refund.cancellationFeePaise !== expectedCancellationFee ||
        refund.amount !== refund.paidAmountPaise - expectedCancellationFee
      ) {
        const error = new Error(
          "Stored refund cancellation fee or refund amount is inconsistent.",
        );
        error.statusCode = 409;
        throw error;
      }

      if (
        refund.policyWindow === "more_than_3_days" &&
        refund.cancellationFeePercent !== 0
      ) {
        const error = new Error(
          "Refund cancellation fee does not match the stored policy window.",
        );
        error.statusCode = 409;
        throw error;
      }

      if (
        refund.policyWindow === "1_to_3_days" &&
        refund.cancellationFeePercent !== 20
      ) {
        const error = new Error(
          "Refund cancellation fee does not match the stored policy window.",
        );
        error.statusCode = 409;
        throw error;
      }

      const payment = await Payment.findOne({
        _id: refund.payment,
        razorpayPaymentId,
      }).session(session);

      if (!payment) {
        const error = new Error(
          "Associated payment record could not be verified.",
        );
        error.statusCode = 404;
        throw error;
      }

      if (
        payment.currency !== "INR" ||
        !Number.isSafeInteger(payment.amount) ||
        payment.amount <= 0 ||
        !payment.booking
      ) {
        const error = new Error("Invalid payment amount, currency or booking.");
        error.statusCode = 409;
        throw error;
      }

      if (!refund.booking || !refund.ticket) {
        const error = new Error(
          "Refund record is missing its booking or ticket association.",
        );
        error.statusCode = 409;
        throw error;
      }

      const ticket = await Ticket.findById(refund.ticket).session(session);

      if (!ticket) {
        const error = new Error("Associated ticket was not found.");
        error.statusCode = 404;
        throw error;
      }

      if (
        !ticket.booking ||
        !ticket.booking.equals(refund.booking) ||
        !payment.booking.equals(refund.booking)
      ) {
        const error = new Error(
          "Refund, ticket and payment relationships do not match.",
        );
        error.statusCode = 409;
        throw error;
      }

      if (
        !isValidPaise(ticket.paidAmountPaise) ||
        ticket.paidAmountPaise !== refund.paidAmountPaise
      ) {
        const error = new Error(
          "Refund amount does not match the original ticket payment.",
        );
        error.statusCode = 409;
        throw error;
      }
async function markRefundConflict(reason) {
  const terminalRefund = ["successful", "failed"].includes(refund.status);

  if (!terminalRefund) {
    refund.status = "requires_reconciliation";

    if (!refund.razorpayRefundId) {
      refund.razorpayRefundId = refundId;
    }

    refund.providerStatus = `conflict_${event.event}`;
    refund.failureReason = reason;

    await refund.save({ session });

    ticket.refundStatus = "requires_reconciliation";

    if (!ticket.razorpayRefundId) {
      ticket.razorpayRefundId = refundId;
    }

    await ticket.save({ session });
  }

  payment.status = "refund_review";
  payment.settlementStatus = "on_hold";

  await payment.save({ session });

  result = {
    requiresReconciliation: true,
    reason,
    refundId,
  };
}
      if (
  refund.razorpayRefundId &&
  refund.razorpayRefundId !== refundId
) {
  await markRefundConflict(
    "Refund record is already associated with another Razorpay refund ID.",
  );
  return;
}

if (
  ticket.razorpayRefundId &&
  ticket.razorpayRefundId !== refundId
) {
  await markRefundConflict(
    "Ticket is associated with a different refund attempt.",
  );
  return;
}

      if (refund.amount !== refundAmountPaise) {
        await markRefundConflict(
          "Webhook refund amount does not match the stored refund amount.",
        );
        return;
      }
      if (refund.status === "successful") {
        if (event.event === "refund.processed") {
          result = {
            alreadyProcessed: true,
            refundId,
          };
          return;
        }

        await markRefundConflict(
          "Razorpay reported a failed refund after the refund was marked successful.",
        );
        return;
      }

      if (refund.status === "failed") {
        if (event.event === "refund.failed") {
          result = {
            alreadyFailed: true,
            refundId,
          };
          return;
        }

        await markRefundConflict(
          "Razorpay reported a processed refund after the refund was marked failed.",
        );
        return;
      }

      const hasSettlement =
        Boolean(payment.settlement) ||
        ["requested", "settled"].includes(payment.settlementStatus);

      if (hasSettlement) {
        await markRefundConflict(
          "A refund webhook was received for a payment already associated with a settlement. Manual financial reconciliation is required.",
        );
        return;
      }

      const calculatePaymentRefundStatus = async () => {
        const successfulRefunds = await Refund.find({
          payment: payment._id,
          status: "successful",
        }).session(session);

        const unresolvedRefunds = await Refund.countDocuments({
          payment: payment._id,
          status: {
            $in: ["pending", "processing", "requires_reconciliation"],
          },
        }).session(session);

        let successfulRefundTotal = 0;

        for (const item of successfulRefunds) {
          if (
            !isValidPaise(item.amount) ||
            item.amount <= 0 ||
            !isValidPaise(item.paidAmountPaise) ||
            !isValidPaise(item.cancellationFeePaise) ||
            ![0, 20].includes(item.cancellationFeePercent) ||
            !["more_than_3_days", "1_to_3_days"].includes(item.policyWindow) ||
            item.paidAmountPaise !== item.cancellationFeePaise + item.amount
          ) {
            const error = new Error(
              "A successful refund contains invalid financial allocation data.",
            );
            error.statusCode = 409;
            throw error;
          }

          const expectedFee = calculatePercentagePaise(
            item.paidAmountPaise,
            item.cancellationFeePercent,
          );

          if (
            item.cancellationFeePaise !== expectedFee ||
            item.amount !== item.paidAmountPaise - expectedFee
          ) {
            const error = new Error(
              "A successful refund has an inconsistent cancellation fee or refund amount.",
            );
            error.statusCode = 409;
            throw error;
          }

          if (
            (item.policyWindow === "more_than_3_days" &&
              item.cancellationFeePercent !== 0) ||
            (item.policyWindow === "1_to_3_days" &&
              item.cancellationFeePercent !== 20)
          ) {
            const error = new Error(
              "A successful refund has a cancellation fee inconsistent with its policy window.",
            );
            error.statusCode = 409;
            throw error;
          }

          successfulRefundTotal += item.amount;

          if (!Number.isSafeInteger(successfulRefundTotal)) {
            const error = new Error(
              "Successful refund total exceeds the safe monetary limit.",
            );
            error.statusCode = 409;
            throw error;
          }
        }

        if (successfulRefundTotal > payment.amount) {
          const error = new Error(
            "Total successful refunds exceed the captured payment amount.",
          );
          error.statusCode = 409;
          throw error;
        }

        const bookingTickets = await Ticket.find({
          booking: payment.booking,
        }).session(session);

        if (!bookingTickets.length) {
          const error = new Error(
            "No tickets found for the associated booking.",
          );
          error.statusCode = 409;
          throw error;
        }

        const successfulRefundsByTicket = new Map();

        for (const item of successfulRefunds) {
          if (!item.ticket || !item.booking) {
            const error = new Error(
              "A successful refund has missing ticket or booking information.",
            );
            error.statusCode = 409;
            throw error;
          }

          if (!item.booking.equals(payment.booking)) {
            const error = new Error(
              "A successful refund belongs to a different booking.",
            );
            error.statusCode = 409;
            throw error;
          }

          const ticketId = item.ticket.toString();

          if (successfulRefundsByTicket.has(ticketId)) {
            const error = new Error(
              "Multiple successful refunds found for the same ticket.",
            );
            error.statusCode = 409;
            throw error;
          }

          successfulRefundsByTicket.set(ticketId, item);
        }

        let originalTicketTotal = 0;
        let platformFeePaise = 0;
        let hostEarningsPaise = 0;

        for (const bookingTicket of bookingTickets) {
          if (
            !isValidPaise(bookingTicket.paidAmountPaise) ||
            !isValidPaise(bookingTicket.platformFeePaise) ||
            !isValidPaise(bookingTicket.hostEarningsPaise)
          ) {
            const error = new Error(
              "A booking ticket has missing or invalid financial allocation data.",
            );
            error.statusCode = 409;
            throw error;
          }

          const originalAllocation =
            bookingTicket.platformFeePaise + bookingTicket.hostEarningsPaise;

          if (
            !Number.isSafeInteger(originalAllocation) ||
            originalAllocation !== bookingTicket.paidAmountPaise
          ) {
            const error = new Error(
              "A booking ticket has inconsistent original financial allocation.",
            );
            error.statusCode = 409;
            throw error;
          }

          originalTicketTotal += bookingTicket.paidAmountPaise;

          if (!Number.isSafeInteger(originalTicketTotal)) {
            const error = new Error(
              "Original ticket allocation exceeds the safe monetary limit.",
            );
            error.statusCode = 409;
            throw error;
          }

          const successfulTicketRefund = successfulRefundsByTicket.get(
            bookingTicket._id.toString(),
          );

          if (successfulTicketRefund) {
            if (
              !successfulTicketRefund.ticket.equals(bookingTicket._id) ||
              !successfulTicketRefund.booking.equals(bookingTicket.booking) ||
              successfulTicketRefund.paidAmountPaise !==
                bookingTicket.paidAmountPaise
            ) {
              const error = new Error(
                "Successful refund does not match its original ticket allocation.",
              );
              error.statusCode = 409;
              throw error;
            }

            const expectedCancellationFee = calculatePercentagePaise(
              successfulTicketRefund.paidAmountPaise,
              successfulTicketRefund.cancellationFeePercent,
            );

            if (
              successfulTicketRefund.cancellationFeePaise !==
                expectedCancellationFee ||
              successfulTicketRefund.amount !==
                successfulTicketRefund.paidAmountPaise - expectedCancellationFee
            ) {
              const error = new Error(
                "Successful refund has an inconsistent cancellation fee or refund amount.",
              );
              error.statusCode = 409;
              throw error;
            }

            hostEarningsPaise += successfulTicketRefund.cancellationFeePaise;
          } else {
            platformFeePaise += bookingTicket.platformFeePaise;
            hostEarningsPaise += bookingTicket.hostEarningsPaise;
          }

          if (
            !Number.isSafeInteger(platformFeePaise) ||
            !Number.isSafeInteger(hostEarningsPaise)
          ) {
            const error = new Error(
              "Recalculated payment allocation exceeds the safe integer limit.",
            );
            error.statusCode = 409;
            throw error;
          }
        }

        if (originalTicketTotal !== payment.amount) {
          const error = new Error(
            "Original ticket allocations do not match the captured payment amount.",
          );
          error.statusCode = 409;
          throw error;
        }

        const allocatedTotal =
          platformFeePaise + hostEarningsPaise + successfulRefundTotal;

        if (
          !Number.isSafeInteger(allocatedTotal) ||
          allocatedTotal !== payment.amount
        ) {
          const error = new Error(
            "Recalculated payment allocations and refunds do not match the captured payment amount.",
          );
          error.statusCode = 409;
          throw error;
        }

        payment.totalRefundedPaise = successfulRefundTotal;
        payment.platformFee = platformFeePaise;
        payment.hostEarnings = hostEarningsPaise;

        if (unresolvedRefunds > 0) {
          payment.status = "refund_review";
          payment.settlementStatus = "on_hold";
          payment.refundedAt = null;
        } else {
          if (successfulRefundTotal === payment.amount) {
            payment.status = "refunded";
            payment.refundedAt = new Date();
          } else if (successfulRefundTotal > 0) {
            payment.status = "partially_refunded";
            payment.refundedAt = null;
          } else {
            payment.status = "successful";
            payment.refundedAt = null;
          }

          if (payment.settlementStatus !== "on_hold") {
            payment.settlementStatus = "available";
          }
        }

        await payment.save({ session });

        return {
          totalRefundedPaise: successfulRefundTotal,
          unresolvedRefunds,
          platformFeePaise,
          hostEarningsPaise,
        };
      };

      if (event.event === "refund.processed") {
        if (
          !["pending", "processing", "requires_reconciliation"].includes(
            refund.status,
          )
        ) {
          const error = new Error(
            `Cannot process refund with status: ${refund.status}`,
          );
          error.statusCode = 409;
          throw error;
        }

        if (
          ticket.status !== "valid" ||
          ticket.attendanceStatus === "checked_in" ||
          !["pending", "processing", "requires_reconciliation"].includes(
            ticket.refundStatus,
          )
        ) {
          await markRefundConflict(
            "Ticket state or attendance status does not match the refund state reported by Razorpay.",
          );
          return;
        }

        const eventDoc = await Event.findById(ticket.event).session(session);

        if (!eventDoc) {
          const error = new Error("Event not found for refunded ticket.");
          error.statusCode = 404;
          throw error;
        }

        const eventTicket = eventDoc.tickets.id(ticket.ticketTypeId);

        if (!eventTicket) {
          const error = new Error("Event ticket tier not found.");
          error.statusCode = 404;
          throw error;
        }

        if (!Number.isSafeInteger(eventTicket.sold) || eventTicket.sold < 1) {
          await markRefundConflict(
            "Event ticket sold count is inconsistent and requires manual reconciliation.",
          );
          return;
        }

        eventTicket.sold -= 1;

        await eventDoc.save({ session });

        refund.status = "successful";
        refund.razorpayRefundId = refundId;
        refund.providerStatus = refundEntity.status || "processed";
        refund.refundedAt = new Date();

        await refund.save({ session });

        ticket.refundStatus = "successful";
        ticket.status = "refunded";
        ticket.cancellationStatus = "cancelled";
        ticket.refundedAt = refund.refundedAt;
        ticket.razorpayRefundId = refundId;

        await ticket.save({ session });

        const paymentSummary = await calculatePaymentRefundStatus();

        result = {
          processed: true,
          refundId,
          totalRefundedPaise: paymentSummary.totalRefundedPaise,
          unresolvedRefunds: paymentSummary.unresolvedRefunds,
          platformFeePaise: paymentSummary.platformFeePaise,
          hostEarningsPaise: paymentSummary.hostEarningsPaise,
        };

        return;
      }

      if (event.event === "refund.failed") {
        if (
          !["pending", "processing", "requires_reconciliation"].includes(
            refund.status,
          )
        ) {
          const error = new Error(
            `Cannot fail refund with status: ${refund.status}`,
          );
          error.statusCode = 409;
          throw error;
        }

        if (
          ticket.refundStatus === "successful" ||
          ticket.status === "refunded"
        ) {
          await markRefundConflict(
            "A failed refund event conflicts with the current refunded ticket state.",
          );
          return;
        }

        refund.status = "failed";
        refund.razorpayRefundId = refundId;
        refund.providerStatus = refundEntity.status || "failed";
        refund.failureReason =
          refundEntity.error_description ||
          "Razorpay confirmed that the refund failed.";

        await refund.save({ session });

        const otherActiveRefunds = await Refund.countDocuments({
          ticket: ticket._id,
          status: {
            $in: ["pending", "processing", "requires_reconciliation"],
          },
          _id: { $ne: refund._id },
        }).session(session);

        let ticketRestored = false;

        if (otherActiveRefunds === 0) {
          ticket.status = "valid";
          ticket.cancellationStatus = "none";
          ticket.cancellationRequestedAt = null;
          ticket.cancellationExpiresAt = null;

          if (ticket.cancellationPolicy) {
            ticket.cancellationPolicy.window = null;
            ticket.cancellationPolicy.feePercent = null;
          }

          ticket.refundStatus = "none";
          ticket.razorpayRefundId = null;
          ticket.refundedAt = null;

          await ticket.save({ session });

          ticketRestored = true;
        }

        const paymentSummary = await calculatePaymentRefundStatus();

        result = {
          failed: true,
          refundId,
          ticketRestored,
          totalRefundedPaise: paymentSummary.totalRefundedPaise,
          unresolvedRefunds: paymentSummary.unresolvedRefunds,
          platformFeePaise: paymentSummary.platformFeePaise,
          hostEarningsPaise: paymentSummary.hostEarningsPaise,
        };
      }
    });

    return result;
  } finally {
    await session.endSession();
  }
};

export const reconcileRazorpayRefundsService =
  createRefundReconciliationService({
    RefundModel: Refund,
    PaymentModel: Payment,
    razorpayClient: razorpay,
    handleRefundWebhook: handleRazorpayRefundWebhookService,
  });
