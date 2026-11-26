import {
  getUserProfileService,
  updateUserProfileService,
  changeUserPasswordService,
  requestUserEmailChangeService,
  verifyUserEmailChangeService,
  getUserAccountStatusService,
} from "../../../services/user.service.js";
import {
  getUserBookingsService,
  getUserTicketService,
} from "../../../services/booking.service.js";
import {
  getUserAttendedEventsService,
  submitFeedbackService,
  updateFeedbackService,
} from "../../../services/feedback.service.js";
import {
  addToWishlistService,
  removeFromWishlistService,
  getWishlistService,
} from "../../../services/wishlist.service.js";

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords don't match",
      });
    }

    const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!strongPassword.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message:
          "Password must contain uppercase, lowercase, number and minimum 8 characters",
      });
    }

    const userId = req.user.userId;

    await changeUserPasswordService(userId, currentPassword, newPassword);

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Change Password error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const requestEmailChange = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({
        success: false,
        message: "Email required",
      });
    }

    await requestUserEmailChangeService(newEmail);

    return res.status(200).json({
      success: true,
      message: "OTP sent to new email",
    });
  } catch (error) {
    console.error("Email change error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const verifyEmailChangeOTP = async (req, res) => {
  try {
    const { newEmail, otp } = req.body;

    if (!otp || !newEmail) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const userId = req.user.userId;

    await verifyUserEmailChangeService(userId, newEmail, otp);

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
    });
  } catch (error) {
    console.error("Verify email error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const profile = await getUserProfileService(userId);

    return res.status(200).json({
      success: true,
      message: "Profile fetched successfully",
      data: profile,
    });
  } catch (error) {
    console.error("Profile fetching error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { name, language } = req.body;

    if (!name || typeof name !== "string") {
      return res.status(400).json({
        success: false,
        message: "Name field is required",
      });
    }

    if (!language) {
      return res.status(400).json({
        success: false,
        message: "Language field is required",
      });
    }

    const data = await updateUserProfileService(userId, name, language);

    return res.status(200).json({
      success: true,
      message: "User Profile Updated",
      data,
    });
  } catch (error) {
    console.error("User Profile Update error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const getAccountStatus = async (req, res) => {
  try {
    const userId = req.user.userId;

    const account = await getUserAccountStatusService(userId);

    return res.status(200).json({
      success: true,
      ...account,
    });
  } catch (error) {
    console.error("Account status error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const getUserBookings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const bookings = await getUserBookingsService(userId);

    return res.status(200).json({
      success: true,
      message: "Bookings fetched successfully.",
      bookings,
    });
  } catch (error) {
    console.error("Get user bookings error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch bookings.",
    });
  }
};

export const getUserTicket = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { bookingId } = req.params;

    const { booking, tickets } = await getUserTicketService(userId, bookingId);

    return res.status(200).json({
      success: true,
      message: "Ticket fetched successfully",
      booking,
      tickets,
    });
  } catch (error) {
    console.error("Get user ticket error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch ticket",
    });
  }
};

export const getUserAttendedEvents = async (req, res) => {
  try {
    const userId = req.user.userId;

    const events = await getUserAttendedEventsService(userId);

    return res.status(200).json({
      success: true,
      message: "Attended events fetched successfully",
      data: events,
    });
  } catch (error) {
    console.error("Get attended events error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch attended events",
    });
  }
};

export const submitFeedback = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;
    const { rating, comment } = req.body;

    const feedback = await submitFeedbackService(userId, eventId, {
      rating,
      comment,
    });

    return res.status(201).json({
      success: true,
      message: "Feedback submitted successfully",
      data: feedback,
    });
  } catch (error) {
    console.error("Submit feedback error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to submit feedback",
    });
  }
};

export const updateFeedback = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;
    const { rating, comment } = req.body;

    const feedback = await updateFeedbackService(userId, eventId, {
      rating,
      comment,
    });

    return res.status(200).json({
      success: true,
      message: "Feedback updated successfully",
      data: feedback,
    });
  } catch (error) {
    console.error("Update feedback error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to update feedback",
    });
  }
};

export const addToWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;

    const wishlistItem = await addToWishlistService(userId, eventId);

    return res.status(201).json({
      success: true,
      message: "Event added to wishlist successfully",
      data: wishlistItem,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to add event to wishlist",
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { eventId } = req.params;

    await removeFromWishlistService(userId, eventId);

    return res.status(200).json({
      success: true,
      message: "Event removed from wishlist successfully",
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to remove event from wishlist",
    });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;

    const wishlist = await getWishlistService(userId);

    return res.status(200).json({
      success: true,
      message: "Wishlist fetched successfully",
      data: wishlist,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch wishlist",
    });
  }
};
