import express from "express";
import {
  approveEvent,
  getAllAdminEvents,
  getAdminEventById,
  getPendingEvents,
  rejectEvent,
  hideEvent,
  unhideEvent,
  approveEventEditRequest,
  rejectEventEditRequest,
  approveUpdatedEvent,
  rejectUpdatedEvent,
  getPendingEventEditRequests,
} from "../controllers/adminEvent.controller.js";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";
const router = express.Router();

router.use(authMiddleware, authorizeRole("admin"));

router.get("/", getPendingEvents);
router.get("/all", getAllAdminEvents);
router.get("/edit-requests/all", getPendingEventEditRequests);
router.get("/:eventId", getAdminEventById);

router.patch("/:eventId/approve", approveEvent);
router.patch("/:eventId/reject", rejectEvent);
router.patch("/:eventId/hide", hideEvent);
router.patch("/:eventId/unhide", unhideEvent);

router.patch("/:eventId/edit-request/approve", approveEventEditRequest);
router.patch("/:eventId/edit-request/reject", rejectEventEditRequest);
router.patch("/:eventId/updated/approve", approveUpdatedEvent)
router.patch("/:eventId/updated/reject", rejectUpdatedEvent)


export default router;
