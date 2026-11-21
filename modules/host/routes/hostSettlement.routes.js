import express from "express";

import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";

import {
  createHostSettlement,
  getHostSettlementSummary,
  getHostSettlementEvents,
  getHostSettlementHistory,
} from "../controllers/hostSettlement.controller.js";

const router = express.Router();

router.use(authMiddleware);
router.use(authorizeRole("host"));

router.get("/summary", getHostSettlementSummary);
router.get("/events", getHostSettlementEvents);
router.get("/history", getHostSettlementHistory);

router.post("/:eventId", createHostSettlement);

export default router;