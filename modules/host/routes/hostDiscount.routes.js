import express from "express";

import {
  hostCreateDiscount,
  hostGetEventDiscounts,
  hostGetDiscountById,
  hostUpdateDiscount,
  hostToggleDiscountStatus,
  hostDeleteDiscount,
} from "../controllers/hostDiscount.controller.js";

import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";

const router = express.Router();

router.use(authMiddleware, authorizeRole("host"));

router.post("/discounts", hostCreateDiscount);

router.get("/events/:eventId/discounts", hostGetEventDiscounts);

router.get("/discounts/:discountId", hostGetDiscountById);

router.patch("/discounts/:discountId", hostUpdateDiscount);

router.patch("/discounts/:discountId/status", hostToggleDiscountStatus);

router.delete("/discounts/:discountId", hostDeleteDiscount);

export default router;
