import { Notification } from "../models/notification.model.js";
import { createNotificationService } from "./notification.service.js";
import { getIO } from "../config/socket.js";

export const dispatchNotificationService = async (notificationData) => {
  const existingNotification = notificationData.idempotencyKey
    ? await Notification.findOne({
        idempotencyKey: notificationData.idempotencyKey,
      })
    : null;

  const notification = await createNotificationService(notificationData);

  if (existingNotification) {
    return notification;
  }

  try {
    const io = getIO();

    io.to(`user:${notification.recipient}`).emit(
      "notification:new",
      notification.toObject(),
    );
  } catch (error) {
    console.error("Real-time notification delivery failed:", error);
  }

  return notification;
};