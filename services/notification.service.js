import mongoose from "mongoose";
import { Notification } from "../models/notification.model.js";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const validateUserId = (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw createError("Invalid user ID", 400);
  }
};

export const createNotificationService = async ({
  recipient,
  recipientRole,
  title,
  message,
  type,
  relatedEntity,
  actionUrl,
  metadata,
  idempotencyKey,
}) => {
  if (!mongoose.Types.ObjectId.isValid(recipient)) {
    throw createError("Invalid notification recipient", 400);
  }

  const allowedRoles = ["user", "host", "admin"];

  if (!allowedRoles.includes(recipientRole)) {
    throw createError("Invalid recipient role", 400);
  }

  if (
    typeof title !== "string" ||
    !title.trim() ||
    title.trim().length > 120
  ) {
    throw createError(
      "Title must be a non-empty string with a maximum of 120 characters",
      400
    );
  }

  if (
    typeof message !== "string" ||
    !message.trim() ||
    message.trim().length > 500
  ) {
    throw createError(
      "Message must be a non-empty string with a maximum of 500 characters",
      400
    );
  }

  const allowedTypes = [
    "booking",
    "payment",
    "refund",
    "event",
    "event_update",
    "event_cancellation",
    "host_application",
    "review",
    "settlement",
    "system",
  ];

  if (!allowedTypes.includes(type)) {
    throw createError("Invalid notification type", 400);
  }

  const allowedEntityTypes = [
    "Booking",
    "Event",
    "Ticket",
    "Payment",
    "Settlement",
    "User",
  ];

  if (relatedEntity !== undefined && relatedEntity !== null) {
    if (
      typeof relatedEntity !== "object" ||
      Array.isArray(relatedEntity) ||
      !allowedEntityTypes.includes(relatedEntity.entityType) ||
      !mongoose.Types.ObjectId.isValid(relatedEntity.entityId)
    ) {
      throw createError("Invalid related entity", 400);
    }
  }

  let normalizedActionUrl;

  if (actionUrl !== undefined && actionUrl !== null) {
    if (typeof actionUrl !== "string" || !actionUrl.trim()) {
      throw createError("Invalid action URL", 400);
    }

    normalizedActionUrl = actionUrl.trim();
  }

  if (
    metadata !== undefined &&
    metadata !== null &&
    (typeof metadata !== "object" || Array.isArray(metadata))
  ) {
    throw createError("Metadata must be an object", 400);
  }

  let normalizedIdempotencyKey;

  if (idempotencyKey !== undefined && idempotencyKey !== null) {
    if (
      typeof idempotencyKey !== "string" ||
      !idempotencyKey.trim()
    ) {
      throw createError("Invalid idempotency key", 400);
    }

    normalizedIdempotencyKey = idempotencyKey.trim();
  }

  if (normalizedIdempotencyKey) {
    const existingNotification = await Notification.findOne({
      idempotencyKey: normalizedIdempotencyKey,
    });

    if (existingNotification) {
      return existingNotification;
    }
  }

  const notificationData = {
    recipient,
    recipientRole,
    title: title.trim(),
    message: message.trim(),
    type,
    ...(relatedEntity && { relatedEntity }),
    ...(normalizedActionUrl && {
      actionUrl: normalizedActionUrl,
    }),
    ...(metadata && { metadata }),
    ...(normalizedIdempotencyKey && {
      idempotencyKey: normalizedIdempotencyKey,
    }),
  };

  try {
    const notification = await Notification.create(notificationData);

    return notification;
  } catch (error) {
    if (error.code === 11000 && normalizedIdempotencyKey) {
      const existingNotification = await Notification.findOne({
        idempotencyKey: normalizedIdempotencyKey,
      });

      if (existingNotification) {
        return existingNotification;
      }
    }

    throw error;
  }
};

export const getNotificationsService = async (
  userId,
  page = 1,
  limit = 10,
  filter = "all"
) => {
  validateUserId(userId);

  if (!Number.isInteger(page) || page < 1) {
    throw createError("Invalid page number", 400);
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
    throw createError("Invalid limit", 400);
  }

  const allowedValues = ["all", "read", "unread"];

  if (!allowedValues.includes(filter)) {
    throw createError("Invalid filter type", 400);
  }

  const skip = (page - 1) * limit;

  const query = {
    recipient: userId,
  };

  if (filter === "read") {
    query.isRead = true;
  } else if (filter === "unread") {
    query.isRead = false;
  }

  const [notifications, totalNotifications] = await Promise.all([
    Notification.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),

    Notification.countDocuments(query),
  ]);

  const totalPages = Math.ceil(totalNotifications / limit);

  return {
    notifications,
    count: notifications.length,
    pagination: {
      page,
      limit,
      skip,
      totalNotifications,
      totalPages,
    },
  };
};

export const markNotificationAsReadService = async (
  userId,
  notificationId
) => {
  validateUserId(userId);

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw createError("Invalid notification ID", 400);
  }

  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw createError("Notification not found", 404);
  }

  if (notification.isRead) {
    return notification;
  }

  notification.isRead = true;
  notification.readAt = new Date();

  await notification.save();

  return notification;
};

export const markAllNotificationsAsReadService = async (userId) => {
  validateUserId(userId);

  const result = await Notification.updateMany(
    {
      recipient: userId,
      isRead: false,
    },
    {
      $set: {
        isRead: true,
        readAt: new Date(),
      },
    }
  );

  return {
    matchedCount: result.matchedCount,
    modifiedCount: result.modifiedCount,
  };
};

export const deleteNotificationService = async (
  userId,
  notificationId
) => {
  validateUserId(userId);

  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw createError("Invalid notification ID", 400);
  }

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    throw createError("Notification not found", 404);
  }

  return {
    deleted: true,
    notificationId: notification._id,
  };
};

export const getUnreadNotificationCountService = async (userId) => {
  validateUserId(userId);

  const notificationCount = await Notification.countDocuments({
    recipient: userId,
    isRead: false,
  });

  return notificationCount;
};