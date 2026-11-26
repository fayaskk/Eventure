import {
  getNotificationsService,
  getUnreadNotificationCountService,
  markNotificationAsReadService,
  markAllNotificationsAsReadService,
  deleteNotificationService,
} from "../../../services/notification.service.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const filter = req.query.filter || "all";

    const data = await getNotificationsService(
      userId,
      page,
      limit,
      filter
    );

    return res.status(200).json({
      success: true,
      message: "Notifications fetched successfully",
      data,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch notifications",
    });
  }
};

export const getUnreadNotificationCount = async (req, res) => {
  try {
    const userId = req.user.userId;

    const count = await getUnreadNotificationCountService(userId);

    return res.status(200).json({
      success: true,
      message: "Unread notification count fetched successfully",
      data: {
        unreadCount: count,
      },
    });
  } catch (error) {
    console.error("Get unread notification count error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to fetch unread notification count",
    });
  }
};

export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    const notification = await markNotificationAsReadService(
      userId,
      notificationId
    );

    return res.status(200).json({
      success: true,
      message: "Notification marked as read successfully",
      data: notification,
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to mark notification as read",
    });
  }
};

export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.userId;

    const result = await markAllNotificationsAsReadService(userId);

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read successfully",
      data: result,
    });
  } catch (error) {
    console.error("Mark all notifications as read error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to mark all notifications as read",
    });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { notificationId } = req.params;

    const result = await deleteNotificationService(
      userId,
      notificationId
    );

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
      data: result,
    });
  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to delete notification",
    });
  }
};