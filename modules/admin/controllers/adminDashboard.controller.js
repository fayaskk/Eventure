import { getAdminDashboardStatsService } from "../../../services/adminDashboard.service.js";

export const getAdminDashboardStats = async (req, res) => {
  try {
    const stats = await getAdminDashboardStatsService();

    return res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error(
      "Admin dashboard stats error:",
      error
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to fetch dashboard statistics",
    });
  }
};