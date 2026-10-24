import mongoose from "mongoose";

import { Event } from "../models/event.model.js";
import { Booking } from "../models/booking.model.js";
import { Payment } from "../models/payment.model.js";
import { getPublicEventByIdService } from "./event.service.js";

export const createBookingService = async (userId, eventId, tickets) => {
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
  let totalAmount = 0;

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

    totalAmount += subtotal;
  }

  const session = await mongoose.startSession();

  try {
    let createdBooking;

    await session.withTransaction(async () => {
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
            totalAmount,
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
  } catch (error) {
    throw error;
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

  return booking;
};
