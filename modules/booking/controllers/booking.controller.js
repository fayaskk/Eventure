import { createBookingService ,requestTicketCancellationService , withdrawTicketCancellationService} from "../../../services/booking.service.js";
import { validateAndCalculateDiscountService, checkEventCouponAvailabilityService} from "../../../services/discount.service.js";

export const createBooking = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { eventId, tickets, couponCode } = req.body;

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

    const booking = await createBookingService(
      userId,
      eventId,
      tickets,
      couponCode || null
    );

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

export const requestTicketCancellation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { ticketId } = req.params;

    const result = await requestTicketCancellationService(
      userId,
      ticketId,
    );

    return res.status(200).json({
      success: true,
      message: "Cancellation requested. You have 30 minutes to withdraw it.",
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

export const withdrawTicketCancellation = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { ticketId } = req.params;

    const result = await withdrawTicketCancellationService(
      userId,
      ticketId,
    );

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result.ticket,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error.",
    });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const userId = req.user?.userId;
    const { eventId, couponCode, ticketSubtotal } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!eventId || !couponCode) {
      return res.status(400).json({
        success: false,
        message: "Event ID and coupon code are required.",
      });
    }

    if (
      typeof ticketSubtotal !== "number" ||
      !Number.isFinite(ticketSubtotal) ||
      ticketSubtotal <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking amount.",
      });
    }

    const result = await validateAndCalculateDiscountService(
      userId,
      eventId,
      couponCode,
      ticketSubtotal,
    );

    return res.status(200).json({
      success: true,
      message: "Coupon applied successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Coupon validation error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to validate coupon.",
    });
  }
};

export const checkCouponAvailability = async (req, res) => {
  try {
    const { eventId } = req.params;

    const result = await checkEventCouponAvailabilityService(eventId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to check coupon availability.",
    });
  }
};