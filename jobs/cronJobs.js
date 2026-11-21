import cron from "node-cron";
import { Booking } from "../models/booking.model.js";
import { Event } from "../models/event.model.js";
import { Ticket } from "../models/ticket.model.js";
import { expireBookingService } from "../services/booking.service.js";
import { initiateScheduledRazorpayRefundService } from "../services/payment.service.js";

const TIME_ZONE = "Asia/Kolkata";

const getEventEndDateTime = (event) => {
  if (!event.eventDate || !event.endTime) {
    return null;
  }

  const [hours, minutes] = event.endTime.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  const dateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(event.eventDate));

  const parts = Object.fromEntries(
    dateParts.map(({ type, value }) => [type, value]),
  );

  return new Date(
    Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      hours,
      minutes,
    ),
  );
};

export const startBookingExpirationJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const expiredBookings = await Booking.find({
        bookingStatus: "pending",
        paymentStatus: "pending",
        paymentExpiresAt: { $lte: new Date() },
      })
        .select("_id")
        .lean();

      if (expiredBookings.length === 0) {
        return;
      }

      for (const booking of expiredBookings) {
        try {
          await expireBookingService(booking._id);
        } catch (error) {
          console.error(
            `[Booking Expiration] Failed for booking ${booking._id}:`,
            error.message,
          );
        }
      }
    } catch (error) {
      console.error("[Booking Expiration] Job failed:", error);
    }
  });

  console.log("[Booking Expiration] Scheduled to run every minute.");
};

export const startEventCompletionJob = () => {
  cron.schedule("* * * * *", async () => {
    try {
      const approvedEvents = await Event.find({
        status: "approved",
      })
        .select("_id eventDate endTime")
        .lean();

      const now = new Date();

      const completedEventIds = approvedEvents
        .filter((event) => {
          const endDateTime = getEventEndDateTime(event);

          return endDateTime && endDateTime.getTime() <= now.getTime();
        })
        .map((event) => event._id);

      if (completedEventIds.length === 0) {
        console.log("[Event Completion] No completed events found.");
        return;
      }

      const result = await Event.updateMany(
        {
          _id: { $in: completedEventIds },
          status: "approved",
        },
        {
          $set: { status: "completed" },
        },
      );
    } catch (error) {
      console.error("[Event Completion] Job failed:", error);
    }
  });
};

let ticketCancellationRefundJob;
let isTicketCancellationRefundJobRunning = false;

export const startTicketCancellationRefundJob = () => {
  if (ticketCancellationRefundJob) {
    console.log("[Ticket Refund] Job is already scheduled.");
    return;
  }

  ticketCancellationRefundJob = cron.schedule("* * * * *", async () => {
    if (isTicketCancellationRefundJobRunning) {
      console.log("[Ticket Refund] Previous execution is still running.");
      return;
    }

    isTicketCancellationRefundJobRunning = true;

    try {
      const now = new Date();

      const expiredCancellationTickets = await Ticket.find({
        status: "valid",
        cancellationStatus: "pending",
        cancellationExpiresAt: { $lte: now },
        refundStatus: "none",
        attendanceStatus: "not_checked_in",
      })
        .select("_id")
        .sort({ cancellationExpiresAt: 1 })
        .limit(100)
        .lean();

      for (const ticket of expiredCancellationTickets) {
        try {
          await initiateScheduledRazorpayRefundService(ticket._id);
        } catch (error) {
          console.error(
            `[Ticket Refund] Processing failed for ticket ${ticket._id}:`,
            error.message,
          );
        }
      }
    } catch (error) {
      console.error("[Ticket Refund] Job failed:", error);
    } finally {
      isTicketCancellationRefundJobRunning = false;
    }
  });

  console.log("[Ticket Refund] Scheduled to run every minute.");
};
