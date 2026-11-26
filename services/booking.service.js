import mongoose from "mongoose";

import { Event } from "../models/event.model.js";
import { Booking } from "../models/booking.model.js";
import { Payment } from "../models/payment.model.js";
import { getPublicEventByIdService } from "./event.service.js";
import { Ticket } from "../models/ticket.model.js";
import { Discount } from "../models/discount.model.js";
import { getEventDateTime } from "../utils/eventDateTime.js";
import { validateAndCalculateDiscountService } from "./discount.service.js";

export const createBookingService = async (
  userId,
  eventId,
  tickets,
  couponCode = null,
) => {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(eventId)
  ) {
    const error = new Error("Invalid user or event ID");
    error.statusCode = 400;
    throw error;
  }

  if (!Array.isArray(tickets) || tickets.length === 0) {
    const error = new Error("Select at least one ticket");
    error.statusCode = 400;
    throw error;
  }

  const event = await getPublicEventByIdService(eventId);

  const bookingTickets = [];
  let ticketSubtotal = 0;

  const selectedTicketIds = new Set();

  for (const ticket of tickets) {
    const { ticketId, quantity } = ticket;

    if (!ticketId || !mongoose.Types.ObjectId.isValid(ticketId)) {
      const error = new Error("Invalid ticket ID");
      error.statusCode = 400;
      throw error;
    }

    if (!Number.isInteger(quantity) || quantity < 1) {
      const error = new Error("Ticket quantity must be a positive integer");
      error.statusCode = 400;
      throw error;
    }

    const normalizedTicketId = ticketId.toString();

    if (selectedTicketIds.has(normalizedTicketId)) {
      const error = new Error("Duplicate ticket type is not allowed");
      error.statusCode = 400;
      throw error;
    }

    selectedTicketIds.add(normalizedTicketId);

    const eventTicket = event.tickets.find(
      (item) => item._id.toString() === normalizedTicketId,
    );

    if (!eventTicket) {
      const error = new Error("Ticket type not found");
      error.statusCode = 404;
      throw error;
    }

    const reserved = eventTicket.reserved ?? 0;
    const sold = eventTicket.sold ?? 0;

    const availableQuantity = eventTicket.quantity - reserved - sold;

    if (quantity > availableQuantity) {
      const error = new Error(
        `Only ${availableQuantity} ${eventTicket.name} tickets are available`,
      );
      error.statusCode = 409;
      throw error;
    }

    const subtotal = eventTicket.price * quantity;

    bookingTickets.push({
      ticketId: eventTicket._id,
      ticketName: eventTicket.name,
      quantity,
      price: eventTicket.price,
      subtotal,
    });

    ticketSubtotal += subtotal;
  }

  const session = await mongoose.startSession();

  try {
    let createdBooking;

    await session.withTransaction(async () => {
      let discountData = null;
      let totalAmount = ticketSubtotal;

      if (couponCode) {
        const discountResult = await validateAndCalculateDiscountService(
          userId,
          eventId,
          couponCode,
          ticketSubtotal,
          session,
        );

        discountData = discountResult.discount;
        totalAmount = discountResult.totalAmount;

        const existingUsageCount = await Booking.countDocuments({
          user: userId,
          "discount.discountId": discountData.discountId,
          discountReservationStatus: {
            $in: ["reserved", "consumed"],
          },
        }).session(session);

        const discountDocument = await Discount.findById(
          discountData.discountId,
        ).session(session);

        if (!discountDocument) {
          const error = new Error("Coupon no longer exists");
          error.statusCode = 404;
          throw error;
        }

        if (existingUsageCount >= discountDocument.perUserLimit) {
          const error = new Error(
            "You have reached the usage limit for this coupon",
          );
          error.statusCode = 409;
          throw error;
        }

        const now = new Date();

        const reservedDiscount = await Discount.findOneAndUpdate(
          {
            _id: discountData.discountId,
            status: "active",
            startDate: { $lte: now },
            endDate: { $gt: now },
            $or: [
              { usageLimit: null },
              {
                $expr: {
                  $lt: [
                    {
                      $add: [
                        { $ifNull: ["$usedCount", 0] },
                        { $ifNull: ["$reservedCount", 0] },
                      ],
                    },
                    "$usageLimit",
                  ],
                },
              },
            ],
          },
          {
            $inc: { reservedCount: 1 },
          },
          {
            new: true,
            session,
          },
        );

        if (!reservedDiscount) {
          const error = new Error(
            "This coupon has reached its usage limit or is no longer active",
          );
          error.statusCode = 409;
          throw error;
        }
      }

      for (const ticket of bookingTickets) {
        const result = await Event.updateOne(
          {
            _id: event._id,
            status: "approved",
            isVisible: true,
            $expr: {
              $gt: [
                {
                  $size: {
                    $filter: {
                      input: "$tickets",
                      as: "eventTicket",
                      cond: {
                        $and: [
                          {
                            $eq: ["$$eventTicket._id", ticket.ticketId],
                          },
                          {
                            $gte: [
                              {
                                $subtract: [
                                  "$$eventTicket.quantity",
                                  {
                                    $add: [
                                      {
                                        $ifNull: ["$$eventTicket.sold", 0],
                                      },
                                      {
                                        $ifNull: ["$$eventTicket.reserved", 0],
                                      },
                                    ],
                                  },
                                ],
                              },
                              ticket.quantity,
                            ],
                          },
                        ],
                      },
                    },
                  },
                },
                0,
              ],
            },
          },
          [
            {
              $set: {
                tickets: {
                  $map: {
                    input: "$tickets",
                    as: "eventTicket",
                    in: {
                      $cond: [
                        {
                          $eq: ["$$eventTicket._id", ticket.ticketId],
                        },
                        {
                          $mergeObjects: [
                            "$$eventTicket",
                            {
                              reserved: {
                                $add: [
                                  {
                                    $ifNull: ["$$eventTicket.reserved", 0],
                                  },
                                  ticket.quantity,
                                ],
                              },
                            },
                          ],
                        },
                        "$$eventTicket",
                      ],
                    },
                  },
                },
              },
            },
          ],
          {
            session,
            timestamps: false,
            updatePipeline: true,
          },
        );

        if (result.modifiedCount !== 1) {
          const error = new Error(
            `Not enough ${ticket.ticketName} tickets are available`,
          );
          error.statusCode = 409;
          throw error;
        }
      }

      const paymentExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

      const bookingReference = `EVT-${cryptoRandomReference()}`;

      const [booking] = await Booking.create(
        [
          {
            event: event._id,
            user: userId,
            tickets: bookingTickets,

            ticketSubtotal,
            totalAmount,

            discount: discountData || undefined,
            discountReservationStatus: discountData ? "reserved" : null,

            bookingReference,
            bookingStatus: "pending",
            paymentStatus: "pending",
            paymentExpiresAt,
          },
        ],
        { session },
      );

      createdBooking = booking;
    });

    return createdBooking;
  } finally {
    await session.endSession();
  }
};

function cryptoRandomReference() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export const getUserBookingsService = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    const error = new Error("Invalid user ID");
    error.statusCode = 400;
    throw error;
  }

  return Booking.find({ user: userId })
    .populate({
      path: "event",
      select:
        "eventName banner eventDate startTime endTime location category status",
      populate: {
        path: "category",
        select: "name slug",
      },
    })
    .sort({ created_at: -1 })
    .lean();
};

export const expireBookingService = async (bookingId) => {
  if (!mongoose.Types.ObjectId.isValid(bookingId)) {
    const error = new Error("Invalid booking ID");
    error.statusCode = 400;
    throw error;
  }

  const session = await mongoose.startSession();

  try {
    let expired = false;

    await session.withTransaction(async () => {
      const now = new Date();

      const booking = await Booking.findOne({
        _id: bookingId,
        bookingStatus: "pending",
        paymentStatus: { $in: ["pending", "failed"] },
        paymentExpiresAt: { $lte: now },
      }).session(session);

      if (!booking) {
        return;
      }

      for (const ticket of booking.tickets) {
        const result = await Event.updateOne(
          {
            _id: booking.event,
            tickets: {
              $elemMatch: {
                _id: ticket.ticketId,
                reserved: { $gte: ticket.quantity },
              },
            },
          },
          {
            $inc: {
              "tickets.$.reserved": -ticket.quantity,
            },
          },
          {
            session,
            timestamps: false,
          },
        );

        if (result.modifiedCount !== 1) {
          const error = new Error(
            `Failed to release reserved ${ticket.ticketName} tickets`,
          );
          error.statusCode = 409;
          throw error;
        }
      }

      if (
        booking.discount &&
        booking.discountReservationStatus === "reserved"
      ) {
        const discountUpdate = await Discount.updateOne(
          {
            _id: booking.discount.discountId,
            reservedCount: { $gt: 0 },
          },
          {
            $inc: {
              reservedCount: -1,
            },
          },
          { session },
        );

        if (discountUpdate.modifiedCount !== 1) {
          const error = new Error("Failed to release coupon reservation");
          error.statusCode = 409;
          throw error;
        }

        booking.discountReservationStatus = "released";
      }

      booking.bookingStatus = "cancelled";
      booking.paymentStatus = "expired";

      await booking.save({ session });

      await Payment.updateMany(
        {
          booking: booking._id,
          status: { $ne: "successful" },
        },
        {
          $set: {
            status: "expired",
          },
        },
        { session },
      );

      expired = true;
    });

    return expired;
  } finally {
    await session.endSession();
  }
};

export const getUserTicketService = async (userId, bookingId) => {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(bookingId)
  ) {
    const error = new Error("Invalid user or booking ID");
    error.statusCode = 400;
    throw error;
  }

  const booking = await Booking.findOne({
    _id: bookingId,
    user: userId,
    bookingStatus: "confirmed",
    paymentStatus: "successful",
  })
    .populate({
      path: "event",
      select: "eventName banner eventDate startTime endTime location category",
      populate: {
        path: "category",
        select: "name slug",
      },
    })
    .lean();

  if (!booking) {
    const error = new Error(
      "Confirmed ticket not found. Please check your booking status.",
    );
    error.statusCode = 404;
    throw error;
  }

  const tickets = await Ticket.find({
    booking: booking._id,
    owner: userId,
  })
    .sort({ createdAt: 1 })
    .lean();

  return {
    booking,
    tickets,
  };
};

export const requestTicketCancellationService = async (
  userId,
  ticketId,
) => {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(ticketId)
  ) {
    const error = new Error("Invalid user or ticket ID.");
    error.statusCode = 400;
    throw error;
  }

  const ticket = await Ticket.findOne({
    _id: ticketId,
    owner: userId,
  });

  if (!ticket) {
    const error = new Error("Ticket not found.");
    error.statusCode = 404;
    throw error;
  }

  if (ticket.status !== "valid") {
    const error = new Error("This ticket is no longer valid.");
    error.statusCode = 400;
    throw error;
  }

  if (ticket.attendanceStatus === "checked_in") {
    const error = new Error(
      "A checked-in ticket cannot be cancelled.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (ticket.cancellationStatus !== "none") {
    const error = new Error(
      "Cancellation has already been requested.",
    );
    error.statusCode = 409;
    throw error;
  }

  const event = await Event.findById(ticket.event)
    .select("_id eventName eventDate startTime status")
    .lean();

  if (!event) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "approved") {
    const error = new Error(
      "This event is not eligible for cancellation.",
    );
    error.statusCode = 400;
    throw error;
  }

  const eventStartDateTime = getEventDateTime(event);

  if (!eventStartDateTime) {
    const error = new Error(
      "Unable to determine the event start time.",
    );
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();

  const cancellationCutoff = new Date(
    eventStartDateTime.getTime() - 24 * 60 * 60 * 1000,
  );

  if (now > cancellationCutoff) {
    const error = new Error(
      "Tickets can only be cancelled at least 24 hours before the event.",
    );
    error.statusCode = 400;
    throw error;
  }

  const remainingTime =
    eventStartDateTime.getTime() - now.getTime();

  const threeDaysInMilliseconds =
    3 * 24 * 60 * 60 * 1000;

  const cancellationPolicy =
    remainingTime > threeDaysInMilliseconds
      ? {
          window: "more_than_3_days",
          feePercent: 0,
        }
      : {
          window: "1_to_3_days",
          feePercent: 20,
        };

  const cancellationExpiresAt = new Date(
    now.getTime() + 30 * 60 * 1000,
  );

  const updatedTicket = await Ticket.findOneAndUpdate(
    {
      _id: ticket._id,
      owner: userId,
      status: "valid",
      attendanceStatus: "not_checked_in",
      cancellationStatus: "none",
      refundStatus: "none",
    },
    {
      $set: {
        cancellationStatus: "pending",
        cancellationRequestedAt: now,
        cancellationExpiresAt,
        "cancellationPolicy.window": cancellationPolicy.window,
        "cancellationPolicy.feePercent":
          cancellationPolicy.feePercent,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select(
    "_id ticketName status cancellationStatus cancellationRequestedAt cancellationExpiresAt cancellationPolicy",
  );

  if (!updatedTicket) {
    const error = new Error(
      "Ticket is no longer eligible for cancellation.",
    );
    error.statusCode = 409;
    throw error;
  }

  return {
    ticket: updatedTicket,
    gracePeriodMinutes: 30,
    cancellationExpiresAt,
  };
};

export const withdrawTicketCancellationService = async (userId, ticketId) => {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(ticketId)
  ) {
    const error = new Error("Invalid user or ticket ID.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();

  const ticket = await Ticket.findOneAndUpdate(
    {
      _id: ticketId,
      owner: userId,
      status: "valid",
      attendanceStatus: "not_checked_in",
      cancellationStatus: "pending",
      cancellationExpiresAt: { $gt: now },
    },
    {
      $set: {
        cancellationStatus: "none",
        cancellationRequestedAt: null,
        cancellationExpiresAt: null,
        "cancellationPolicy.window": null,
        "cancellationPolicy.feePercent": null,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select(
    "_id ticketName status cancellationStatus cancellationRequestedAt cancellationExpiresAt cancellationPolicy",
  );

  if (!ticket) {
    const error = new Error(
      "Cancellation cannot be withdrawn. The grace period may have expired or the ticket is no longer eligible.",
    );
    error.statusCode = 409;
    throw error;
  }

  return {
    ticket,
    message: "Cancellation request withdrawn successfully.",
  };
};
