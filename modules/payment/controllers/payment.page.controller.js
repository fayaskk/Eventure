import process from "process"
export const renderPaymentPage = (req, res) => {
  const { bookingId } = req.params;

  return res.render("user/payment", {
    bookingId,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  });
};