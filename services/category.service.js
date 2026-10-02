import { Category } from "../models/category.model.js";

export const getActiveCategoriesService = async () => {
  return await Category.find({
    isActive: true,
  });
};