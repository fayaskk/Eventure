import { checkInTicketService } from "../../../services/ticketCheckin.service.js";

export const checkInTicket = async (req, res) => {
  try {
    const hostId = req.user.userId;
    const { ticketCode } = req.body;

    const result = await checkInTicketService(hostId, ticketCode);

    return res.status(200).json({
      success: true,
      message: "Entry approved. Ticket checked in successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Ticket check-in error:", error.message);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Unable to verify ticket.",
    });
  }
};
