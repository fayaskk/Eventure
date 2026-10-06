import express from "express";
import { renderPaymentPage } from "../controllers/payment.page.controller.js";

const router = express.Router();

router.get("/:bookingId", renderPaymentPage);

export default router;