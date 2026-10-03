import express from "express";

import { authMiddleware } from "../../../middleware/auth.middleware.js"
import { authorizeRole } from "../../../middleware/role.middleware.js"
import { createEventReport } from "../controllers/eventReport.controller.js"

const router = express.Router();

router.post("/:eventId/report", authMiddleware, authorizeRole("user"), createEventReport);

export default router ;