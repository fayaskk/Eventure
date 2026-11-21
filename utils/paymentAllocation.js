export const allocatePaymentToTickets = (
  bookedTickets,
  totalPaidPaise,
  commissionPercent = 10,
) => {
  if (
    !Array.isArray(bookedTickets) ||
    bookedTickets.length === 0 ||
    !Number.isSafeInteger(totalPaidPaise) ||
    totalPaidPaise < 0 ||
    !Number.isFinite(commissionPercent) ||
    commissionPercent < 0 ||
    commissionPercent > 100
  ) {
    throw new Error("Invalid payment allocation details.");
  }

  const ticketUnits = [];

  for (const bookedTicket of bookedTickets) {
    if (
      !Number.isFinite(bookedTicket.price) ||
      bookedTicket.price < 0 ||
      !Number.isInteger(bookedTicket.quantity) ||
      bookedTicket.quantity < 1
    ) {
      throw new Error("Invalid booked ticket details.");
    }

    const unitPricePaise = Math.round(bookedTicket.price * 100);

    if (!Number.isSafeInteger(unitPricePaise)) {
      throw new Error("Invalid ticket price.");
    }

    for (let i = 0; i < bookedTicket.quantity; i++) {
      ticketUnits.push({
        ticketName: bookedTicket.ticketName,
        ticketTypeId: bookedTicket.ticketId,
        originalPricePaise: unitPricePaise,
        paidAmountPaise: 0,
        platformFeePaise: 0,
        hostEarningsPaise: 0,
      });
    }
  }

  const totalOriginalPaise = ticketUnits.reduce(
    (total, ticket) => total + ticket.originalPricePaise,
    0,
  );

  if (!Number.isSafeInteger(totalOriginalPaise)) {
    throw new Error("Total ticket amount exceeds the supported limit.");
  }

  if (totalPaidPaise > totalOriginalPaise) {
    throw new Error(
      "Payment amount cannot exceed the original ticket subtotal.",
    );
  }

  if (totalOriginalPaise === 0) {
    if (totalPaidPaise !== 0) {
      throw new Error(
        "Cannot allocate a positive payment to zero-priced tickets.",
      );
    }

    return ticketUnits;
  }

  const totalOriginalBigInt = BigInt(totalOriginalPaise);
  const totalPaidBigInt = BigInt(totalPaidPaise);

  let allocatedPaise = 0;

  const allocationDetails = ticketUnits.map((ticket, index) => {
    const numerator =
      BigInt(ticket.originalPricePaise) * totalPaidBigInt;

    const allocatedAmount = numerator / totalOriginalBigInt;
    const remainder = numerator % totalOriginalBigInt;

    ticket.paidAmountPaise = Number(allocatedAmount);

    allocatedPaise += ticket.paidAmountPaise;

    return {
      index,
      remainder,
    };
  });

  let remainingPaise = totalPaidPaise - allocatedPaise;

  allocationDetails.sort((a, b) => {
    if (a.remainder > b.remainder) return -1;
    if (a.remainder < b.remainder) return 1;
    return a.index - b.index;
  });

  for (let i = 0; i < remainingPaise; i++) {
    ticketUnits[allocationDetails[i].index].paidAmountPaise += 1;
  }

  let totalPlatformFeePaise = 0;

  for (const ticket of ticketUnits) {
    ticket.platformFeePaise = Math.round(
      (ticket.paidAmountPaise * commissionPercent) / 100,
    );

    ticket.hostEarningsPaise =
      ticket.paidAmountPaise - ticket.platformFeePaise;

    totalPlatformFeePaise += ticket.platformFeePaise;
  }

  const finalAllocatedPaise = ticketUnits.reduce(
    (total, ticket) => total + ticket.paidAmountPaise,
    0,
  );

  const finalFinancialAllocation = ticketUnits.reduce(
    (total, ticket) =>
      total + ticket.platformFeePaise + ticket.hostEarningsPaise,
    0,
  );

  if (
    finalAllocatedPaise !== totalPaidPaise ||
    finalFinancialAllocation !== totalPaidPaise ||
    !Number.isSafeInteger(totalPlatformFeePaise)
  ) {
    throw new Error("Payment allocation verification failed.");
  }

  return ticketUnits;
};