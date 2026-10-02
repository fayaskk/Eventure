import {
  getAllHostsService,
  getHostByIdService,
  blockAndUnblockHostService,
} from "../../../services/host.service.js";

export const getAllHosts = async (req, res) => {
  try {
    const {
      search = "",
      blocked,
      verified,
    } = req.query;

    const hosts = await getAllHostsService({
      search,
      blocked,
      verified,
    });

    return res.status(200).json({
      success: true,
      count: hosts.length,
      hosts,
    });
  } catch (error) {
    console.error("Get all hosts error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch hosts",
    });
  }
};

export const getHostById = async (req, res) => {
  try {
    const { id } = req.params;

    const host = await getHostByIdService(id);

    return res.status(200).json({
      success: true,
      host,
    });
  } catch (error) {
    console.error("Get host by ID error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch host",
    });
  }
};

export const blockAndUnblockHost = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await blockAndUnblockHostService(id);

    return res.status(200).json({
      success: true,
      message: result.message,
      isBlocked: result.isBlocked,
    });
  } catch (error) {
    console.error("Block/unblock host error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to update host block status",
    });
  }
};