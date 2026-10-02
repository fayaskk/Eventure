import mongoose from "mongoose";
import { getPublicEventByIdService } from "./event.service.js";

export const createBookingService = async (
  userId,
  eventId,
  tickets
) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await getPublicEventByIdService(eventId);

  if (!Array.isArray(tickets) || tickets.length === 0) {
    const error = new Error("Select at least one ticket");
    error.statusCode = 400;
    throw error;
  }

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

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      const error = new Error(
        "Ticket quantity must be a positive integer"
      );
      error.statusCode = 400;
      throw error;
    }

    if (selectedTicketIds.has(ticketId)) {
      const error = new Error(
        "Duplicate ticket type is not allowed"
      );
      error.statusCode = 400;
      throw error;
    }

    selectedTicketIds.add(ticketId);

    const eventTicket = event.tickets.find(
      (ticket) => ticket._id.toString() === ticketId
    );

    if (!eventTicket) {
      const error = new Error("Ticket type not found");
      error.statusCode = 404;
      throw error;
    }

    const availableQuantity =
      eventTicket.quantity - eventTicket.sold;

    if (quantity > availableQuantity) {
      const error = new Error(
        `Only ${availableQuantity} ${eventTicket.name} tickets are available`
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

  return {
    event: event._id,
    user: userId,
    tickets: bookingTickets,
    totalAmount,
  };
};