import mongoose from "mongoose";

import { Event } from "../models/event.model.js";
import { Booking } from "../models/booking.model.js";
import { getPublicEventByIdService } from "./event.service.js";

export const createBookingService = async (userId, eventId, tickets) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
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

    if (selectedTicketIds.has(ticketId)) {
      const error = new Error("Duplicate ticket type is not allowed");
      error.statusCode = 400;
      throw error;
    }

    selectedTicketIds.add(ticketId);

    const eventTicket = event.tickets.find(
      (ticket) => ticket._id.toString() === ticketId,
    );

    if (!eventTicket) {
      const error = new Error("Ticket type not found");
      error.statusCode = 404;
      throw error;
    }

    const reserved = eventTicket.reserved || 0;
    const sold = eventTicket.sold || 0;

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
    session.startTransaction();

    for (const ticket of bookingTickets) {
      const result = await Event.updateOne(
        {
          _id: event._id,
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
                                        $ifNull: ["$$eventTicket.reserved", 0],
                                      },
                                      {
                                        $ifNull: ["$$eventTicket.sold", 0],
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
          updatePipeline: true,
        },
      );

      if (result.modifiedCount !== 1) {
        const error = new Error(
          `Only enough ${ticket.ticketName} tickets are available`,
        );
        error.statusCode = 409;
        throw error;
      }
    }

    const paymentExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const bookingReference = `EVT-${Date.now()}-${Math.floor(
      Math.random() * 100000,
    )}`;

    const booking = await Booking.create(
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

    await session.commitTransaction();

    return booking[0];
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
};

export const expireBookingService = async (bookingId) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      const booking = await Booking.findOne({
        _id: bookingId,
        bookingStatus: "pending",
        paymentStatus: "pending",
        paymentExpiresAt: { $lte: new Date() },
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
          { session },
        );

        if (result.modifiedCount !== 1) {
          const error = new Error(
            `Failed to release ${ticket.quantity} reserved ${ticket.ticketName} tickets`,
          );
          error.statusCode = 409;
          throw error;
        }
      }

      booking.bookingStatus = "cancelled";
      booking.paymentStatus = "expired";

      await booking.save({ session });
    });

    return true;
  } finally {
    await session.endSession();
  }
};
