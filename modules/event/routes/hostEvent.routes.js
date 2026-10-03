import express from "express";
import { createHostEvent, getHostEventById, getHostEvents, submitHostEvent, updateHostEvent } from "../controllers/hostEvent.controller.js";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";

const router = express.Router()
router.use(authMiddleware,authorizeRole("host"))
router.post("/", createHostEvent);
router.get("/", getHostEvents );
router.get("/:eventId", getHostEventById)
router.patch("/:eventId", updateHostEvent)
router.post("/:eventId/submit", submitHostEvent);

export default router;