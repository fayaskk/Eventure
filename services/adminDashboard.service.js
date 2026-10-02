import { User } from "../models/user.model.js";
import { Host } from "../models/hostApplication.model.js";

export const getAdminDashboardStatsService = async () => {
  const totalUsers = await User.countDocuments({
    role: "user",
  });

  const verifiedHosts = await Host.countDocuments({
    verificationStatus: "approved",
  });

  const pendingApplications = await Host.countDocuments({
    verificationStatus: "pending",
  });

  return {
    totalUsers,
    verifiedHosts,
    pendingApplications,
    activeEvents: 0,
    totalBookings: 0,
    totalRevenue: 0,
  };
};