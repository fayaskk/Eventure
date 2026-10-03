import express from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";
import { dismissEventReport, getReportedEvents, getReportsByEvent, resolveEventReport } from "../controllers/adminEventReport.controller.js";


const router = express.Router();

router.use(authMiddleware, authorizeRole("admin"))
router.get("/", getReportedEvents)
router.get("/:eventId", getReportsByEvent)
router.patch("/:reportId/resolve", resolveEventReport)
router.patch("/:reportId/dismiss", dismissEventReport)
export default router ;