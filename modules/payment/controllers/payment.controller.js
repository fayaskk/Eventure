import {
  createRazorpayOrderService,
  verifyRazorpayPaymentService,handleRazorpayPaymentFailureService
} from "../../../services/payment.service.js";

export const createRazorpayOrder = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const result = await createRazorpayOrderService(req.user.userId, bookingId);

    return res.status(201).json({
      success: true,
      message: "Razorpay order created successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRazorpayPayment = async (req, res, next) => {
  try {
    const { razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    const result = await verifyRazorpayPaymentService(req.user.userId, {
      razorpayPaymentId,
      razorpayOrderId,
      razorpaySignature,
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyProcessed
        ? "Payment was already verified"
        : "Payment verified successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const handleRazorpayPaymentFailure = async (req, res, next) => {
  try {
    const result = await handleRazorpayPaymentFailureService(
      req.user.userId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Payment failure recorded",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
