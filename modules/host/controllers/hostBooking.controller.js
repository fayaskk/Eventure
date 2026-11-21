import mongoose from "mongoose";
import { Booking } from "../../../models/booking.model.js";
import { Payment } from "../../../models/payment.model.js";
import { Ticket } from "../../../models/ticket.model.js";
import { Event } from "../../../models/event.model.js";

const getEventTimingStatus = (event) => {
  if (!event) return "unknown";

  if (event.status === "cancelled") return "cancelled";
  if (event.status === "completed") return "completed";

  const now = new Date();
  const eventDate = new Date(event.eventDate);

  if (Number.isNaN(eventDate.getTime())) return "unknown";

  const parseTime = (time) => {
    if (!time) return null;

    const match = String(time).match(
      /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i
    );

    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();

    if (minutes > 59 || hours > 23) return null;

    if (meridiem) {
      if (hours < 1 || hours > 12) return null;

      if (meridiem === "PM" && hours !== 12) hours += 12;
      if (meridiem === "AM" && hours === 12) hours = 0;
    }

    return { hours, minutes };
  };

  const start = parseTime(event.startTime);
  const end = parseTime(event.endTime);

  if (!start || !end) return "unknown";

  const startDate = new Date(eventDate);
  startDate.setHours(start.hours, start.minutes, 0, 0);

  const endDate = new Date(eventDate);
  endDate.setHours(end.hours, end.minutes, 0, 0);

  if (endDate <= startDate) {
    endDate.setDate(endDate.getDate() + 1);
  }

  if (now < startDate) return "upcoming";
  if (now <= endDate) return "ongoing";

  return "completed";
};

const fetchHostBookings = async (hostId) => {
  const eventIds = await Event.distinct("_id", {
    host: hostId,
  });

  return Booking.find({
    event: { $in: eventIds },
  })
    .populate(
      "event",
      "eventName eventDate startTime endTime status banner location"
    )
    .populate("user", "name email");
};

const getBookingPaymentMap = async (bookings) => {
  const bookingIds = bookings.map((booking) => booking._id);

  const payments = await Payment.find({
    booking: { $in: bookingIds },
  }).select(
    "booking amount currency status razorpayPaymentId refundAmount"
  );

  return new Map(
    payments.map((payment) => [
      payment.booking.toString(),
      payment,
    ])
  );
};

const isSuccessfulBooking = (booking, payment) => {
  return (
    booking.bookingStatus === "confirmed" &&
    booking.paymentStatus === "successful" &&
    payment?.status === "successful"
  );
};

export const getHostBookingSummary = async (req, res) => {
  try {
    const bookings = await fetchHostBookings(req.user.userId);
    const paymentMap = await getBookingPaymentMap(bookings);

    const summary = {
      totalBookings: 0,
      totalTickets: 0,
      totalRevenue: 0,
      upcomingBookings: 0,
      ongoingBookings: 0,
      completedBookings: 0,
      cancelledBookings: 0,
      refundedBookings: 0,
      checkedInTickets: 0,
      notCheckedInTickets: 0,
    };

    const successfulBookingIds = [];

    for (const booking of bookings) {
      const payment = paymentMap.get(booking._id.toString());

      const successful = isSuccessfulBooking(booking, payment);

      if (booking.bookingStatus === "cancelled") {
        summary.cancelledBookings++;
      }

      if (
        booking.paymentStatus === "refunded" ||
        payment?.status === "refunded"
      ) {
        summary.refundedBookings++;
      }

      if (!successful) continue;

      successfulBookingIds.push(booking._id);

      summary.totalBookings++;

      const ticketCount = booking.tickets.reduce(
        (total, ticket) => total + ticket.quantity,
        0
      );

      summary.totalTickets += ticketCount;
      summary.totalRevenue += Number(payment.amount || 0) / 100;

      const eventStatus = getEventTimingStatus(booking.event);

      if (eventStatus === "upcoming") {
        summary.upcomingBookings++;
      } else if (eventStatus === "ongoing") {
        summary.ongoingBookings++;
      } else if (eventStatus === "completed") {
        summary.completedBookings++;
      }
    }

    if (successfulBookingIds.length) {
      const tickets = await Ticket.find({
        booking: { $in: successfulBookingIds },
        status: "valid",
      }).select("attendanceStatus");

      summary.checkedInTickets = tickets.filter(
        (ticket) => ticket.attendanceStatus === "checked_in"
      ).length;

      summary.notCheckedInTickets = tickets.filter(
        (ticket) => ticket.attendanceStatus === "not_checked_in"
      ).length;
    }

    return res.status(200).json({
      success: true,
      message: "Booking summary retrieved successfully.",
      data: summary,
    });
  } catch (error) {
    console.error("Host booking summary error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to retrieve booking summary.",
    });
  }
};

export const getHostBookings = async (req, res) => {
  try {
    const hostId = req.user.userId;

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10)
    );

    const search = String(req.query.search || "").trim().toLowerCase();
    const filter = String(req.query.filter || "all").toLowerCase();
    const eventId = String(req.query.eventId || "").trim();

    const allowedFilters = [
      "all",
      "upcoming",
      "ongoing",
      "completed",
      "cancelled",
      "refunded",
    ];

    if (!allowedFilters.includes(filter)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking filter.",
      });
    }

    if (eventId && !mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid event ID.",
      });
    }

    const bookings = await fetchHostBookings(hostId);
    const paymentMap = await getBookingPaymentMap(bookings);

    let results = bookings.filter((booking) => {
      const payment = paymentMap.get(booking._id.toString());

      if (eventId && booking.event?._id.toString() !== eventId) {
        return false;
      }

      if (filter === "cancelled") {
        return booking.bookingStatus === "cancelled";
      }

      if (filter === "refunded") {
        return (
          booking.paymentStatus === "refunded" ||
          payment?.status === "refunded"
        );
      }

      if (!isSuccessfulBooking(booking, payment)) {
        return false;
      }

      if (filter !== "all") {
        return getEventTimingStatus(booking.event) === filter;
      }

      return true;
    });

    if (search) {
      results = results.filter((booking) => {
        const attendeeName = booking.user?.name || "";
        const attendeeEmail = booking.user?.email || "";
        const bookingReference = booking.bookingReference || "";
        const eventName = booking.event?.eventName || "";

        return (
          attendeeName.toLowerCase().includes(search) ||
          attendeeEmail.toLowerCase().includes(search) ||
          bookingReference.toLowerCase().includes(search) ||
          eventName.toLowerCase().includes(search)
        );
      });
    }

    results.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    const total = results.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    const paginatedBookings = results.slice(
      (page - 1) * limit,
      page * limit
    );

    const data = paginatedBookings.map((booking) => {
      const payment = paymentMap.get(booking._id.toString());

      return {
        _id: booking._id,
        bookingReference: booking.bookingReference,
        attendee: {
          _id: booking.user?._id,
          name: booking.user?.name || "Unknown attendee",
          email: booking.user?.email || "",
        },
        event: {
          _id: booking.event?._id,
          eventName: booking.event?.eventName || "Unknown event",
          eventDate: booking.event?.eventDate,
          startTime: booking.event?.startTime,
          endTime: booking.event?.endTime,
          banner: booking.event?.banner,
          status: booking.event?.status,
          timingStatus: getEventTimingStatus(booking.event),
        },
        tickets: booking.tickets,
        totalTickets: booking.tickets.reduce(
          (total, ticket) => total + ticket.quantity,
          0
        ),
        amountPaid: Number(payment?.amount || 0) / 100,
        currency: payment?.currency || "INR",
        paymentStatus: booking.paymentStatus,
        bookingStatus: booking.bookingStatus,
        paymentReference: payment?.razorpayPaymentId || null,
        bookingDate: booking.created_at,
      };
    });

    return res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully.",
      data: {
        bookings: data,
        pagination: {
          currentPage: page,
          totalPages,
          total,
          limit,
        },
      },
    });
  } catch (error) {
    console.error("Host bookings error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to retrieve bookings.",
    });
  }
};

export const getHostBookingDetails = async (req, res) => {
  try {
    const { bookingId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const booking = await Booking.findById(bookingId)
      .populate({
        path: "event",
        match: { host: req.user.userId },
        select: "eventName eventDate startTime endTime status banner location",
      })
      .populate("user", "name email");

    if (!booking || !booking.event) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const payment = await Payment.findOne({
      booking: booking._id,
    }).select(
      "amount currency status razorpayPaymentId refundAmount razorpayRefundId refundedAt"
    );

    const tickets = await Ticket.find({
      booking: booking._id,
      event: booking.event._id,
    })
      .populate("owner", "name email")
      .populate("checkedInBy", "name")
      .sort({ createdAt: 1 });

    const ticketCount = booking.tickets.reduce(
      (total, ticket) => total + ticket.quantity,
      0
    );

    return res.status(200).json({
      success: true,
      message: "Booking details retrieved successfully.",
      data: {
        booking: {
          _id: booking._id,
          bookingReference: booking.bookingReference,
          bookingStatus: booking.bookingStatus,
          paymentStatus: booking.paymentStatus,
          bookingDate: booking.created_at,
          tickets: booking.tickets,
          ticketSubtotal: booking.ticketSubtotal,
          totalAmount: booking.totalAmount,
          discount: booking.discount,
          totalTickets: ticketCount,
        },
        attendee: {
          _id: booking.user?._id,
          name: booking.user?.name || "Unknown attendee",
          email: booking.user?.email || "",
        },
        event: {
          _id: booking.event._id,
          eventName: booking.event.eventName,
          eventDate: booking.event.eventDate,
          startTime: booking.event.startTime,
          endTime: booking.event.endTime,
          status: booking.event.status,
          timingStatus: getEventTimingStatus(booking.event),
          banner: booking.event.banner,
          location: booking.event.location,
        },
        payment: payment
          ? {
              amount: Number(payment.amount || 0) / 100,
              currency: payment.currency,
              status: payment.status,
              paymentReference: payment.razorpayPaymentId,
              refundAmount: Number(payment.refundAmount || 0) / 100,
              refundReference: payment.razorpayRefundId,
              refundedAt: payment.refundedAt,
            }
          : null,
        ticketDetails: tickets.map((ticket) => ({
          _id: ticket._id,
          ticketName: ticket.ticketName,
          ticketCode: ticket.ticketCode,
          price: ticket.price,
          status: ticket.status,
          attendanceStatus: ticket.attendanceStatus,
          cancellationStatus: ticket.cancellationStatus,
          refundStatus: ticket.refundStatus,
          assignedAt: ticket.assignedAt,
          checkedInAt: ticket.checkedInAt,
          owner: ticket.owner
            ? {
                name: ticket.owner.name,
                email: ticket.owner.email,
              }
            : null,
          checkedInBy: ticket.checkedInBy?.name || null,
        })),
      },
    });
  } catch (error) {
    console.error("Host booking details error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to retrieve booking details.",
    });
  }
};