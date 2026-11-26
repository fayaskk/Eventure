import {
  createDiscountService,
  getEventDiscountsService,
  getDiscountByIdService,
  updateDiscountService,
  toggleDiscountStatusService,
  deleteDiscountService,
} from "../../../services/discount.service.js";

export const hostCreateDiscount = async (req, res) => {
  try {
    const hostId = req.user.userId;

    const discount = await createDiscountService(
      hostId,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: "Discount created successfully.",
      discount,
    });
  } catch (error) {
    console.error("Host Create Discount Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const hostGetEventDiscounts = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { eventId } = req.params;

    const discounts = await getEventDiscountsService(
      hostId,
      eventId
    );

    return res.status(200).json({
      success: true,
      message: "Event discounts fetched successfully.",
      discounts,
    });
  } catch (error) {
    console.error("Host Get Event Discounts Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const hostGetDiscountById = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { discountId } = req.params;

    const discount = await getDiscountByIdService(
      hostId,
      discountId
    );

    return res.status(200).json({
      success: true,
      message: "Discount fetched successfully.",
      discount,
    });
  } catch (error) {
    console.error("Host Get Discount Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const hostUpdateDiscount = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { discountId } = req.params;

    const discount = await updateDiscountService(
      hostId,
      discountId,
      req.body
    );

    return res.status(200).json({
      success: true,
      message: "Discount updated successfully.",
      discount,
    });
  } catch (error) {
    console.error("Host Update Discount Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const hostToggleDiscountStatus = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { discountId } = req.params;

    const discount = await toggleDiscountStatusService(
      hostId,
      discountId
    );

    return res.status(200).json({
      success: true,
      message: "Discount status updated successfully.",
      discount,
    });
  } catch (error) {
    console.error("Host Toggle Discount Status Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};

export const hostDeleteDiscount = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { discountId } = req.params;

    const result = await deleteDiscountService(
      hostId,
      discountId
    );

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    console.error("Host Delete Discount Error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server Error",
    });
  }
};