import express from "express";
import { getTransactionHistory } from "../controllers/transaction.controller.js";

const router = express.Router();

router.get("/", getTransactionHistory);

export default router;