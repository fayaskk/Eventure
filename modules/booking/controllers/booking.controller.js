import { createBookingService } from "../../../services/booking.service.js";

export const createBooking = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { eventId, tickets } = req.body;

    const booking = await createBookingService(
      userId,
      eventId,
      tickets
    );

    return res.status(201).json({
      success: true,
      message: "Booking created successfully",
      booking,
    });
  } catch (error) {
    console.error("Booking creation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};