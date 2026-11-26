import mongoose from "mongoose";
import { Discount } from "../models/discount.model.js";
import { Event } from "../models/event.model.js";

export const createDiscountService = async (hostId, discountData) => {
  const {
    eventId,
    title,
    code,
    description,
    discountType,
    discountValue,
    maxDiscount,
    minBookingAmount,
    startDate,
    endDate,
    usageLimit,
    perUserLimit,
  } = discountData;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID.");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    host: hostId,
  });

  if (!event) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }

  if (event.status !== "approved" || !event.isVisible) {
    const error = new Error(
      "Discounts can only be created for approved and visible events.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    !title?.trim() ||
    !code?.trim() ||
    typeof discountType !== "string" ||
    discountValue === undefined ||
    discountValue === null ||
    !startDate ||
    !endDate
  ) {
    const error = new Error("Required discount fields are missing.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedDiscountType = discountType.trim().toLowerCase();

  if (!["percentage", "fixed"].includes(normalizedDiscountType)) {
    const error = new Error(
      "Discount type should be only fixed or percentage.",
    );
    error.statusCode = 400;
    throw error;
  }

  const value = Number(discountValue);

  if (!Number.isFinite(value) || value <= 0) {
    const error = new Error("Discount value must be greater than zero.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedDiscountType === "percentage" && value > 100) {
    const error = new Error("Percentage discount cannot exceed 100%.");
    error.statusCode = 400;
    throw error;
  }

  const maximumDiscount =
    maxDiscount === undefined || maxDiscount === null || maxDiscount === ""
      ? null
      : Number(maxDiscount);

  if (
    maximumDiscount !== null &&
    (!Number.isFinite(maximumDiscount) || maximumDiscount <= 0)
  ) {
    const error = new Error("Invalid maximum discount amount.");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedDiscountType === "fixed" && maximumDiscount !== null) {
    const error = new Error(
      "Maximum discount cap is only applicable to percentage discounts.",
    );
    error.statusCode = 400;
    throw error;
  }

  const minimumAmount = Number(minBookingAmount ?? 0);

  if (!Number.isFinite(minimumAmount) || minimumAmount < 0) {
    const error = new Error("Invalid minimum booking amount.");
    error.statusCode = 400;
    throw error;
  }

  const totalUsageLimit =
    usageLimit === undefined || usageLimit === null || usageLimit === ""
      ? null
      : Number(usageLimit);

  if (
    totalUsageLimit !== null &&
    (!Number.isInteger(totalUsageLimit) || totalUsageLimit < 1)
  ) {
    const error = new Error("Usage limit must be a positive integer.");
    error.statusCode = 400;
    throw error;
  }

  const userUsageLimit = Number(perUserLimit ?? 1);

  if (!Number.isInteger(userUsageLimit) || userUsageLimit < 1) {
    const error = new Error("Per-user limit must be a positive integer.");
    error.statusCode = 400;
    throw error;
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    const error = new Error("Invalid discount dates.");
    error.statusCode = 400;
    throw error;
  }

  if (end <= start) {
    const error = new Error("Discount end date must be later than start date.");
    error.statusCode = 400;
    throw error;
  }

  if (end <= new Date()) {
    const error = new Error("Discount end date must be in the future.");
    error.statusCode = 400;
    throw error;
  }

  const normalizedCode = code.trim().toUpperCase();
  const couponRegex = /^[A-Z0-9_-]+$/;

  if (
    normalizedCode.length < 3 ||
    normalizedCode.length > 30 ||
    !couponRegex.test(normalizedCode)
  ) {
    const error = new Error("Invalid coupon code format.");
    error.statusCode = 400;
    throw error;
  }

  const existingDiscount = await Discount.findOne({
    event: eventId,
    code: normalizedCode,
  });

  if (existingDiscount) {
    const error = new Error(
      "This discount code already exists for this event.",
    );
    error.statusCode = 409;
    throw error;
  }

  try {
    const discount = await Discount.create({
      host: hostId,
      event: eventId,
      title: title.trim(),
      code: normalizedCode,
      description: description?.trim() || "",
      discountType: normalizedDiscountType,
      discountValue: value,
      maxDiscount: maximumDiscount,
      minBookingAmount: minimumAmount,
      startDate: start,
      endDate: end,
      usageLimit: totalUsageLimit,
      perUserLimit: userUsageLimit,
    });

    return discount;
  } catch (error) {
    if (error.code === 11000) {
      const duplicateError = new Error(
        "This discount code already exists for this event.",
      );
      duplicateError.statusCode = 409;
      throw duplicateError;
    }

    throw error;
  }
};

export const getEventDiscountsService = async (hostId, eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID.");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    host: hostId,
  });

  if (!event) {
    const error = new Error("Event not found.");
    error.statusCode = 404;
    throw error;
  }

  const discounts = await Discount.find({
    event: eventId,
    host: hostId,
  }).sort({ created_at: -1 });

  return discounts;
};

export const getDiscountByIdService = async (hostId, discountId) => {
  if (!mongoose.Types.ObjectId.isValid(discountId)) {
    const error = new Error("Invalid discount ID.");
    error.statusCode = 400;
    throw error;
  }

  const discount = await Discount.findOne({
    _id: discountId,
    host: hostId,
  }).populate("event", "eventName eventDate status isVisible");

  if (!discount) {
    const error = new Error("Discount not found.");
    error.statusCode = 404;
    throw error;
  }

  return discount;
};

export const updateDiscountService = async (hostId, discountId, updateData) => {
  if (!mongoose.Types.ObjectId.isValid(discountId)) {
    const error = new Error("Invalid discount ID.");
    error.statusCode = 400;
    throw error;
  }

  const discount = await Discount.findOne({
    _id: discountId,
    host: hostId,
  });

  if (!discount) {
    const error = new Error("Discount not found.");
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    "title",
    "description",
    "discountValue",
    "maxDiscount",
    "minBookingAmount",
    "startDate",
    "endDate",
    "usageLimit",
    "perUserLimit",
  ];

  const invalidFields = Object.keys(updateData).filter(
    (field) => !allowedFields.includes(field),
  );

  if (invalidFields.length > 0) {
    const error = new Error(
      `These fields cannot be updated: ${invalidFields.join(", ")}`,
    );
    error.statusCode = 400;
    throw error;
  }

  if (Object.keys(updateData).length === 0) {
    const error = new Error("No fields provided for update.");
    error.statusCode = 400;
    throw error;
  }

  const updatedValue =
    updateData.discountValue !== undefined
      ? Number(updateData.discountValue)
      : discount.discountValue;

  const updatedMaxDiscount =
    updateData.maxDiscount !== undefined
      ? updateData.maxDiscount === null || updateData.maxDiscount === ""
        ? null
        : Number(updateData.maxDiscount)
      : discount.maxDiscount;

  const updatedMinAmount =
    updateData.minBookingAmount !== undefined
      ? Number(updateData.minBookingAmount)
      : discount.minBookingAmount;

  const updatedUsageLimit =
    updateData.usageLimit !== undefined
      ? updateData.usageLimit === null || updateData.usageLimit === ""
        ? null
        : Number(updateData.usageLimit)
      : discount.usageLimit;

  const updatedPerUserLimit =
    updateData.perUserLimit !== undefined
      ? Number(updateData.perUserLimit)
      : discount.perUserLimit;

  if (!Number.isFinite(updatedValue) || updatedValue <= 0) {
    const error = new Error("Discount value must be greater than zero.");
    error.statusCode = 400;
    throw error;
  }

  if (discount.discountType === "percentage" && updatedValue > 100) {
    const error = new Error("Percentage discount cannot exceed 100%.");
    error.statusCode = 400;
    throw error;
  }

  if (
    updatedMaxDiscount !== null &&
    (!Number.isFinite(updatedMaxDiscount) || updatedMaxDiscount <= 0)
  ) {
    const error = new Error("Maximum discount must be greater than zero.");
    error.statusCode = 400;
    throw error;
  }

  if (discount.discountType === "fixed" && updatedMaxDiscount !== null) {
    const error = new Error(
      "Maximum discount cap is only applicable to percentage discounts.",
    );
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(updatedMinAmount) || updatedMinAmount < 0) {
    const error = new Error("Minimum booking amount cannot be negative.");
    error.statusCode = 400;
    throw error;
  }

  if (
    updatedUsageLimit !== null &&
    (!Number.isInteger(updatedUsageLimit) || updatedUsageLimit < 1)
  ) {
    const error = new Error("Usage limit must be a positive integer.");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isInteger(updatedPerUserLimit) || updatedPerUserLimit < 1) {
    const error = new Error("Per-user limit must be a positive integer.");
    error.statusCode = 400;
    throw error;
  }

  const updatedStartDate = updateData.startDate
    ? new Date(updateData.startDate)
    : discount.startDate;

  const updatedEndDate = updateData.endDate
    ? new Date(updateData.endDate)
    : discount.endDate;

  if (
    Number.isNaN(updatedStartDate.getTime()) ||
    Number.isNaN(updatedEndDate.getTime())
  ) {
    const error = new Error("Invalid discount dates.");
    error.statusCode = 400;
    throw error;
  }

  if (updatedEndDate <= updatedStartDate) {
    const error = new Error("End date must be later than start date.");
    error.statusCode = 400;
    throw error;
  }

  if (updatedEndDate <= new Date()) {
    const error = new Error("Discount end date must be in the future.");
    error.statusCode = 400;
    throw error;
  }

  if (updateData.title !== undefined) {
    if (
      typeof updateData.title !== "string" ||
      !updateData.title.trim() ||
      updateData.title.trim().length > 100
    ) {
      const error = new Error("Invalid discount title.");
      error.statusCode = 400;
      throw error;
    }

    discount.title = updateData.title.trim();
  }

  if (updateData.description !== undefined) {
    if (
      typeof updateData.description !== "string" ||
      updateData.description.length > 300
    ) {
      const error = new Error("Invalid discount description.");
      error.statusCode = 400;
      throw error;
    }

    discount.description = updateData.description.trim();
  }

  discount.discountValue = updatedValue;
  discount.maxDiscount = updatedMaxDiscount;
  discount.minBookingAmount = updatedMinAmount;
  discount.usageLimit = updatedUsageLimit;
  discount.perUserLimit = updatedPerUserLimit;
  discount.startDate = updatedStartDate;
  discount.endDate = updatedEndDate;

  await discount.save();

  return discount;
};

export const toggleDiscountStatusService = async (hostId, discountId) => {
  if (!mongoose.Types.ObjectId.isValid(discountId)) {
    const error = new Error("Invalid discount ID.");
    error.statusCode = 400;
    throw error;
  }

  const discount = await Discount.findOne({
    _id: discountId,
    host: hostId,
  });

  if (!discount) {
    const error = new Error("Discount not found.");
    error.statusCode = 404;
    throw error;
  }

  discount.status = discount.status === "active" ? "inactive" : "active";

  await discount.save();

  return discount;
};

export const deleteDiscountService = async (hostId, discountId) => {
  if (!mongoose.Types.ObjectId.isValid(discountId)) {
    const error = new Error("Invalid discount ID.");
    error.statusCode = 400;
    throw error;
  }

  const discount = await Discount.findOne({
    _id: discountId,
    host: hostId,
  });

  if (!discount) {
    const error = new Error("Discount not found.");
    error.statusCode = 404;
    throw error;
  }

  await Discount.deleteOne({
    _id: discountId,
    host: hostId,
  });

  return {
    success: true,
    message: "Discount deleted successfully.",
  };
};

export const validateAndCalculateDiscountService = async (
  userId,
  eventId,
  couponCode,
  ticketSubtotal,
) => {
  if (
    !mongoose.Types.ObjectId.isValid(userId) ||
    !mongoose.Types.ObjectId.isValid(eventId)
  ) {
    const error = new Error("Invalid user or event ID.");
    error.statusCode = 400;
    throw error;
  }

  if (!couponCode || typeof couponCode !== "string") {
    const error = new Error("Please enter a valid coupon code.");
    error.statusCode = 400;
    throw error;
  }

  if (!Number.isFinite(ticketSubtotal) || ticketSubtotal <= 0) {
    const error = new Error("Invalid booking amount.");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    status: "approved",
    isVisible: true,
  });

  if (!event) {
    const error = new Error("Event is unavailable.");
    error.statusCode = 404;
    throw error;
  }

  const normalizedCode = couponCode.trim().toUpperCase();
  const now = new Date();

  const discount = await Discount.findOne({
    event: eventId,
    code: normalizedCode,
    status: "active",
    startDate: { $lte: now },
    endDate: { $gt: now },
  });

  if (!discount) {
    const error = new Error("Invalid, inactive or expired coupon.");
    error.statusCode = 400;
    throw error;
  }

  if (
    discount.usageLimit !== null &&
    discount.usedCount >= discount.usageLimit
  ) {
    const error = new Error("This coupon has reached its usage limit.");
    error.statusCode = 409;
    throw error;
  }

  if (ticketSubtotal < discount.minBookingAmount) {
    const error = new Error(
      `Minimum booking amount for this coupon is ₹${discount.minBookingAmount}.`,
    );
    error.statusCode = 400;
    throw error;
  }

  let discountAmount ;

  if (discount.discountType === "percentage") {
    discountAmount = (ticketSubtotal * discount.discountValue) / 100;

    if (discount.maxDiscount !== null) {
      discountAmount = Math.min(discountAmount, discount.maxDiscount);
    }
  } else {
    discountAmount = discount.discountValue;
  }

  discountAmount = Math.min(discountAmount, ticketSubtotal);

  discountAmount = Number(discountAmount.toFixed(2));

  const totalAmount = Number((ticketSubtotal - discountAmount).toFixed(2));

  return {
    discount: {
      discountId: discount._id,
      code: discount.code,
      title: discount.title,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      maxDiscount: discount.maxDiscount,
      discountAmount,
    },
    ticketSubtotal,
    totalAmount,
  };
};


export const checkEventCouponAvailabilityService = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID.");
    error.statusCode = 400;
    throw error;
  }

  const now = new Date();

  const event = await Event.findOne({
    _id: eventId,
    status: "approved",
    isVisible: true,
  });

  if (!event) {
    const error = new Error("Event is unavailable.");
    error.statusCode = 404;
    throw error;
  }

  const availableCoupon = await Discount.findOne({
    event: eventId,
    status: "active",
    startDate: { $lte: now },
    endDate: { $gt: now },
    $or: [
      { usageLimit: null },
      { usageLimit: { $exists: false } },
      {
        $expr: {
          $lt: ["$usedCount", "$usageLimit"],
        },
      },
    ],
  }).select("_id");

  return {
    hasCoupons: Boolean(availableCoupon),
  };
};