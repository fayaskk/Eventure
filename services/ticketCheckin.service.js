import mongoose from "mongoose";
import { Ticket } from "../models/ticket.model.js";
import { Event } from "../models/event.model.js";

export const checkInTicketService = async (hostId, ticketCode) => {
  if (!mongoose.Types.ObjectId.isValid(hostId)) {
    const error = new Error("Invalid host.");
    error.statusCode = 400;
    throw error;
  }

  if (
    typeof ticketCode !== "string" ||
    ticketCode.length !== 64 ||
    !/^[a-f0-9]{64}$/i.test(ticketCode)
  ) {
    const error = new Error("Invalid ticket QR code.");
    error.statusCode = 400;
    throw error;
  }

  const ticket = await Ticket.findOne({ ticketCode })
    .select("_id event status attendanceStatus cancellationStatus")
    .lean();

  if (!ticket) {
    const error = new Error("Ticket not found.");
    error.statusCode = 404;
    throw error;
  }

  const event = await Event.findOne({
    _id: ticket.event,
    host: hostId,
  })
    .select("_id eventName status eventDate startTime endTime")
    .lean();

  if (!event) {
    const error = new Error("You are not authorized to check in this ticket.");
    error.statusCode = 403;
    throw error;
  }

  if (event.status !== "approved" && event.status !== "completed") {
    const error = new Error("This event is not eligible for check-in.");
    error.statusCode = 400;
    throw error;
  }

  if (ticket.status !== "valid") {
    const error = new Error("This ticket is cancelled or otherwise invalid.");
    error.statusCode = 400;
    throw error;
  }

  if (ticket.attendanceStatus === "checked_in") {
    const error = new Error("This ticket has already been checked in.");
    error.statusCode = 409;
    throw error;
  }
  if (ticket.cancellationStatus !== "none") {
    const error = new Error(
      "This ticket has a pending or completed cancellation.",
    );
    error.statusCode = 400;
    throw error;
  }

  const checkedInTicket = await Ticket.findOneAndUpdate(
    {
      _id: ticket._id,
      event: event._id,
      status: "valid",
      attendanceStatus: "not_checked_in",
      cancellationStatus: "none",
    },
    {
      $set: {
        attendanceStatus: "checked_in",
        checkedInAt: new Date(),
        checkedInBy: hostId,
      },
    },
    {
      new: true,
      runValidators: true,
    },
  ).select("_id ticketName ticketCode attendanceStatus checkedInAt");

  if (!checkedInTicket) {
    const error = new Error(
      "This ticket has already been checked in or is no longer valid.",
    );
    error.statusCode = 409;
    throw error;
  }

  return {
    event: {
      id: event._id,
      name: event.eventName,
    },
    ticket: checkedInTicket,
  };
};
