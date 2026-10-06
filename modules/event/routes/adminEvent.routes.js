import express from "express";
import { approveEvent, getAdminEventById, getPendingEvents, rejectEvent } from "../controllers/adminEvent.controller.js";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";
const router = express.Router()

router.use(authMiddleware, authorizeRole("admin"))
router.get("/", getPendingEvents);
router.get("/:eventId", getAdminEventById)
router.patch("/:eventId/approve", approveEvent)
router.patch("/:eventId/reject", rejectEvent)

export default router;