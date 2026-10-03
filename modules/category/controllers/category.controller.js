import { getActiveCategoriesService } from "../../../services/category.service.js";

export const getCategories = async (req, res) => {
  try {
    const categories = await getActiveCategoriesService();

    return res.status(200).json({
      success: true,
      message: "Active categories fetched successfully",
      data: categories,
    });
  } catch (error) {
    console.error("Category controller error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to fetch categories",
    });
  }
};