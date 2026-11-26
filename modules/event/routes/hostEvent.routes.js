import express from "express";

import {
  createHostEvent,
  getHostEventById,
  getHostEvents,
  requestEventEdit,
  submitHostEvent,
  updateHostEvent,
  resubmitRejectedEvent
} from "../controllers/hostEvent.controller.js";

import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";
import { uploadEventFiles } from "../../../middleware/eventUpload.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRole("host"));

router.post("/", uploadEventFiles.fields([{ name: "banner", maxCount: 1 },{ name: "promoVideo", maxCount: 1 }]), createHostEvent);

router.get("/", getHostEvents);

router.get("/:eventId", getHostEventById);

router.patch("/:eventId", uploadEventFiles.fields([{ name: "banner", maxCount: 1 },{ name: "promoVideo", maxCount: 1 }]), updateHostEvent);

router.post("/:eventId/submit", submitHostEvent);

router.post("/:eventId/edit-request", requestEventEdit);

router.patch("/:eventId/resubmit",   uploadEventFiles.fields([{ name: "banner", maxCount: 1 },{ name: "promoVideo", maxCount: 1 }]), resubmitRejectedEvent)

export default router;
