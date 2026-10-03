import {
  getAllUsersService,
  getUserByIdService,
  updateUserService,
  blockAndUnblockUserService,
} from "../../../services/user.service.js";

export const getAllUsers = async (req, res) => {
  try {
    const {
      search = "",
      isBlocked,
      isVerified,
      page,
      limit,
    } = req.query;

    const result = await getAllUsersService({
      search,
      isBlocked,
      isVerified,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      count: result.count,
      users: result.users,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get all users error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch users",
    });
  }
};

export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await getUserByIdService(id);

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Get user by ID error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch user",
    });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await updateUserService(id, req.body);

    return res.status(200).json({
      success: true,
      message: "User updated successfully",
      user,
    });
  } catch (error) {
    console.error("Update user error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update user",
    });
  }
};

export const blockAndUnblockUser = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await blockAndUnblockUserService(id);

    return res.status(200).json({
      success: true,
      message: result.message,
      isBlocked: result.isBlocked,
    });
  } catch (error) {
    console.error("Block/unblock user error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message:
        error.message ||
        "Failed to update user block status",
    });
  }
};