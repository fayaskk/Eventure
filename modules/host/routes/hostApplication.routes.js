import express from "express";

import {
  getMyHostApplication,
  createHostApplication,
  updateHostApplication,
} from "../controllers/hostApplication.controller.js";

import { authMiddleware } from "../../../middleware/auth.middleware.js";

import { uploadHostDocuments } from "../../../middleware/upload.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";
const router = express.Router();

router.post("/", authMiddleware, authorizeRole("user"), uploadHostDocuments.fields([
    { name: "identityProof", maxCount: 1 },
    { name: "organizationProof", maxCount: 1 },
    { name: "addressProof", maxCount: 1 },
    { name: "bankProof", maxCount: 1 },
  ]), createHostApplication);

router.put("/", authMiddleware, authorizeRole("user"), uploadHostDocuments.fields([
    {
      name: "identityProof",
      maxCount: 1,
    },
    {
      name: "organizationProof",
      maxCount: 1,
    },
    {
      name: "addressProof",
      maxCount: 1,
    },
    {
      name: "bankProof",
      maxCount: 1,
    },
  ]), updateHostApplication);



router.get("/my-application", authMiddleware, getMyHostApplication);



export default router;
