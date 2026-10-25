import { createBookingService } from "../../../services/booking.service.js";

export const createBooking = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { eventId, tickets } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        message: "Event ID is required.",
      });
    }

    if (!Array.isArray(tickets) || tickets.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Select at least one ticket.",
      });
    }

    const booking = await createBookingService(userId, eventId, tickets);

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      booking,
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};
