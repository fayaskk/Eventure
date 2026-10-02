import {
  getHostProfileService,
  updateHostProfileService,
} from "../../../services/host.service.js";

export const hostGetProfile = async (req, res) => {
  try {
    const hostId = req.user.userId;

    const profile =
      await getHostProfileService(hostId);

    return res.status(200).json({
      success: true,
      message: "Host profile fetched successfully",
      profile,
    });
  } catch (error) {
    console.error(
      "Host Get Profile Error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};

export const hostUpdateProfile = async (req, res) => {
  try {
    const hostId = req.user.userId;

    await updateHostProfileService(
      hostId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Host profile updated successfully",
    });
  } catch (error) {
    console.error(
      "Host Profile Update Error:",
      error,
    );

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message || "Server Error",
    });
  }
};