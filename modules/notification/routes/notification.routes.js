import express from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";

import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getNotifications);

router.get("/unread-count", getUnreadNotificationCount);

router.patch("/read-all", markAllNotificationsAsRead);

router.patch("/:notificationId/read", markNotificationAsRead);

router.delete("/:notificationId", deleteNotification);

export default router;