import crypto from "crypto";
import Razorpay from "razorpay";
import mongoose from "mongoose";

import { Booking } from "../models/booking.model.js";
import { Payment } from "../models/payment.model.js";
import { Event } from "../models/event.model.js";

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

  const payment = await Payment.findOne({
    razorpayOrderId,
  });

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

  const session = await mongoose.startSession();

  try {
    let updatedPayment;
    let updatedBooking;

    await session.withTransaction(async () => {
      const currentPayment = await Payment.findById(payment._id).session(
        session,
      );

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

      const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);

      if (
        razorpayPayment.order_id !== razorpayOrderId ||
        razorpayPayment.status !== "captured" ||
        razorpayPayment.amount !== currentPayment.amount ||
        razorpayPayment.currency !== currentPayment.currency
      ) {
        const error = new Error(
          "Razorpay payment details could not be verified",
        );
        error.statusCode = 400;
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

      currentPayment.razorpayPaymentId = razorpayPaymentId;
      currentPayment.status = "successful";
      currentPayment.failureReason = undefined;

      await currentPayment.save({ session });

      currentBooking.bookingStatus = "confirmed";
      currentBooking.paymentStatus = "successful";

      await currentBooking.save({ session });

      updatedPayment = currentPayment;
      updatedBooking = currentBooking;
    });

    return {
      payment: updatedPayment,
      booking: updatedBooking,
      alreadyProcessed:
        updatedPayment?.status === "successful" &&
        updatedPayment?.razorpayPaymentId === razorpayPaymentId,
    };
  } finally {
    await session.endSession();
  }
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
