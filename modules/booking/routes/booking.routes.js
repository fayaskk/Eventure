import express from "express";
import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";
import { createBooking } from "../controllers/booking.controller.js";
const router = express.Router()
router.use(authMiddleware, authorizeRole("user"),)
router.post("/",  createBooking)

export default router;