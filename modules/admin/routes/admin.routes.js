import express from "express";

import {
  adminLogin,
  adminForgotPassword,
  adminVerifyForgotPasswordOTP,
  adminResetPassword,
} from "../controllers/adminAuth.controller.js";

import {
  adminChangePassword,
  adminRequestEmailChange,
  adminVerifyEmailChangeOTP,
  adminGetProfile,
  adminUpdateProfile,
} from "../controllers/adminProfile.controller.js";

import {
  getAllUsers,
  getUserById,
  updateUser,
  blockAndUnblockUser
} from "../controllers/userManagement.controller.js";

import {
  getAllHosts,
  getHostById,
  blockAndUnblockHost,
} from "../controllers/hostManagement.controller.js";

import {
  getHostApplications,
  getHostApplicationById,
  approveHostApplication,
  rejectHostApplication,
  viewHostApplicationDocument,
} from "../controllers/hostApplication.controller.js";

import { authMiddleware } from "../../../middleware/auth.middleware.js";
import { authorizeRole } from "../../../middleware/role.middleware.js";
import { getAdminDashboardStats } from "../controllers/adminDashboard.controller.js";


const router = express.Router();

router.post("/login", adminLogin);
router.use(authMiddleware, authorizeRole("admin"))
router.get("/dashboard/stats",  getAdminDashboardStats);

router.get("/users",  getAllUsers);
router.get("/users/:id",  getUserById);
router.patch("/users/:id",  updateUser);
router.patch("/users/:id/block",  blockAndUnblockUser);


router.get("/hosts-applications",  getHostApplications);
router.get( "/hosts-applications/:id",  getHostApplicationById);
router.get("/hosts-applications/:id/documents/:documentType",  viewHostApplicationDocument);
router.patch("/hosts-applications/:id/approve", approveHostApplication);
router.patch("/hosts-applications/:id/reject", rejectHostApplication,);
router.get("/hosts",  getAllHosts);
router.get("/hosts/:id",  getHostById);
router.patch("/hosts/:id/block", blockAndUnblockHost,);

router.patch("/profile/change-password", adminChangePassword,);
router.post("/forgot-password", adminForgotPassword);
router.post("/verify-forgot-password-otp", adminVerifyForgotPasswordOTP);
router.post("/reset-password", adminResetPassword);
router.post("/profile/request-email-change", adminRequestEmailChange,);
router.patch( "/profile/verify-email-change", adminVerifyEmailChangeOTP,);
router.get("/profile",  adminGetProfile);
router.patch("/profile", adminUpdateProfile,);

export default router;
