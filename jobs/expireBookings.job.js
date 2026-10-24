import cron from "node-cron";


import { Booking } from "../models/booking.model.js";
import { expireBookingService } from "../services/booking.service.js";

export const startBookingExpirationJob = () => {
  cron.schedule("* * * * *", async () => {
    console.log("[Booking Expiration] Checking for expired bookings...");

    try {
      const expiredBookings = await Booking.find({
        bookingStatus: "pending",
        paymentStatus: "pending",
        paymentExpiresAt: { $lte: new Date() },
      })
        .select("_id")
        .lean();

      if (expiredBookings.length === 0) {
        console.log("[Booking Expiration] No expired bookings found.");
        return;
      }

      console.log(
        `[Booking Expiration] Found ${expiredBookings.length} expired booking(s).`,
      );

      for (const booking of expiredBookings) {
        try {
          await expireBookingService(booking._id);

          console.log(`[Booking Expiration] Processed booking: ${booking._id}`);
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
