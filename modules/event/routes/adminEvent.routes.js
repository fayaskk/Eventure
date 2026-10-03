import express from "express";
import { approveEvent, getAdminEventById, getPendingEvents, rejectEvent } from "../controllers/adminEvent.controller.js";
const router = express.Router()

router.get("/events", getPendingEvents);
router.get("/events/:eventId", getAdminEventById)
router.patch("/events/:eventId/approve", approveEvent)
router.patch("/events/:eventId/reject", rejectEvent)

export default router;