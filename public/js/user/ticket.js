const ticketContainer = document.getElementById("digital-ticket-container");

const CANCELLATION_BASE_URL = "/api/events/bookings/tickets";

let countdownInterval = null;

const getTicketToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken")
  );
};

const escapeTicketHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatTicketDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTicketCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

const formatCountdown = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const getCancellationStatusHtml = (ticket) => {
  if (ticket.status === "refunded" || ticket.refundStatus === "processed") {
    return `
      <div class="ticket-cancellation-status status-refunded">
        <strong>Refund completed</strong>
        <p>Your refund has been processed.</p>
      </div>
    `;
  }

  if (ticket.refundStatus === "pending") {
    return `
      <div class="ticket-cancellation-status status-refund-pending">
        <strong>Refund initiated</strong>
        <p>Your refund request has been sent to the payment provider.</p>
      </div>
    `;
  }

  if (ticket.refundStatus === "failed") {
    return `
      <div class="ticket-cancellation-status status-refund-failed">
        <strong>Refund processing issue</strong>
        <p>Please contact Eventure support if this status remains unchanged.</p>
      </div>
    `;
  }

  if (ticket.cancellationStatus === "pending") {
    return `
      <div class="ticket-cancellation-status status-cancellation-pending">
        <strong>Cancellation requested</strong>
        <p>
          You can withdraw this request within:
          <span
            class="cancellation-countdown"
            data-expiry="${escapeTicketHtml(ticket.cancellationExpiresAt)}"
          >Calculating...</span>
        </p>
        <button
          type="button"
          class="withdraw-cancellation-button"
          data-ticket-id="${escapeTicketHtml(ticket._id)}"
        >
          Withdraw Cancellation
        </button>
      </div>
    `;
  }

  if (ticket.cancellationStatus === "cancelled") {
    return `
      <div class="ticket-cancellation-status status-cancelled">
        <strong>Ticket cancelled</strong>
        <p>This ticket has been cancelled.</p>
      </div>
    `;
  }

  return "";
};

const canRequestCancellation = (ticket, event) => {
  if (
    ticket.status !== "valid" ||
    ticket.attendanceStatus === "checked_in" ||
    ticket.cancellationStatus !== "none" ||
    ticket.refundStatus !== "none"
  ) {
    return false;
  }

  if (!event.eventDate || !event.startTime) {
    return false;
  }

  const eventDate = new Date(event.eventDate);

  if (Number.isNaN(eventDate.getTime())) {
    return false;
  }

  const [hours, minutes] = event.startTime.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return false;
  }

  eventDate.setHours(hours, minutes, 0, 0);

  const cancellationCutoff = eventDate.getTime() - 24 * 60 * 60 * 1000;

  return Date.now() < cancellationCutoff;
};

const getTicketActionHtml = (ticket, event) => {
  if (ticket.cancellationStatus === "pending") {
    return "";
  }

  if (!canRequestCancellation(ticket, event)) {
    return "";
  }

  return `
    <button
      type="button"
      class="cancel-ticket-button"
      data-ticket-id="${escapeTicketHtml(ticket._id)}"
    >
      Cancel Ticket
    </button>
  `;
};

const loadDigitalTicket = async () => {
  const token = getTicketToken();

  if (!token) {
    window.location.replace("/login");
    return;
  }

  const bookingId = window.location.pathname.split("/").filter(Boolean).at(-1);

  if (!bookingId) {
    showTicketError("Invalid ticket address.");
    return;
  }

  try {
    const response = await fetch(
      `/api/users/bookings/${encodeURIComponent(bookingId)}/ticket`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");

      window.location.replace("/login");
      return;
    }

    if (
      !response.ok ||
      !result.success ||
      !result.booking ||
      !Array.isArray(result.tickets)
    ) {
      throw new Error(result.message || "Unable to load your digital tickets.");
    }

    renderDigitalTicket(result.booking, result.tickets);
  } catch (error) {
    console.error("Digital Ticket Error:", error);
    showTicketError(error.message || "Unable to load your tickets.");
  }
};

const renderDigitalTicket = (booking, tickets) => {
  const event = booking.event || {};

  if (
    booking.bookingStatus !== "confirmed" ||
    booking.paymentStatus !== "successful"
  ) {
    showTicketError("This booking does not have a valid confirmed ticket.");
    return;
  }

  if (tickets.length === 0) {
    showTicketError("No individual tickets were found for this booking.");
    return;
  }

  if (countdownInterval) {
    clearInterval(countdownInterval);
  }

  const individualTicketsHtml = tickets
    .map(
      (ticket, index) => `
        <article class="individual-ticket">
          <div class="individual-ticket-header">
            <div>
              <span class="ticket-row-label">Ticket ${index + 1}</span>
              <h3>${escapeTicketHtml(ticket.ticketName || "Event Ticket")}</h3>
            </div>

            <span class="individual-ticket-status">
              ${escapeTicketHtml(ticket.status || "valid")}
            </span>
          </div>

          <div class="individual-ticket-details">
            <div>
              <span>Ticket Price</span>
              <strong>${formatTicketCurrency(ticket.price)}</strong>
            </div>

            <div>
              <span>Admission Status</span>
              <strong>
                ${
                  ticket.attendanceStatus === "checked_in"
                    ? "Already checked in"
                    : "Not checked in"
                }
              </strong>
            </div>
          </div>

          <section class="ticket-cancellation-section">
            ${getCancellationStatusHtml(ticket)}
            ${getTicketActionHtml(ticket, event)}
          </section>

          <div class="individual-ticket-qr-section">
            <h4>Admission QR Code</h4>
            <p>Present this individual QR code at the event entrance.</p>

            <div
              id="ticket-qr-${escapeTicketHtml(ticket._id)}"
              class="ticket-qr-code"
            ></div>

            <span class="qr-booking-reference">
              Ticket ID: ${escapeTicketHtml(ticket._id)}
            </span>
          </div>
        </article>
      `,
    )
    .join("");

  ticketContainer.innerHTML = `
    <article class="digital-ticket-card">
      <div class="digital-ticket-banner">
        ${
          event.banner
            ? `
              <img
                src="${escapeTicketHtml(event.banner)}"
                alt="${escapeTicketHtml(event.eventName || "Event")}"
              >
            `
            : ""
        }

        <div class="digital-ticket-banner-overlay">
          <span class="digital-ticket-status">✓ Booking Confirmed</span>
          <h2>${escapeTicketHtml(event.eventName || "Event")}</h2>
          <p>${escapeTicketHtml(event.category?.name || "Event")}</p>
        </div>
      </div>

      <div class="digital-ticket-body">
        <section class="digital-ticket-details">
          <div class="digital-ticket-info">
            <span>Date</span>
            <strong>${formatTicketDate(event.eventDate)}</strong>
          </div>

          <div class="digital-ticket-info">
            <span>Time</span>
            <strong>
              ${escapeTicketHtml(event.startTime || "Unavailable")}
              –
              ${escapeTicketHtml(event.endTime || "Unavailable")}
            </strong>
          </div>

          <div class="digital-ticket-info">
            <span>Venue</span>
            <strong>
              ${escapeTicketHtml(event.location?.venue || "Unavailable")}
            </strong>
          </div>

          <div class="digital-ticket-info">
            <span>Location</span>
            <strong>
              ${escapeTicketHtml(event.location?.city || "")}
              ${
                event.location?.state
                  ? `, ${escapeTicketHtml(event.location.state)}`
                  : ""
              }
            </strong>
          </div>
        </section>

        <section class="digital-ticket-items">
          <h3>Your Individual Tickets (${tickets.length})</h3>
          ${individualTicketsHtml}
        </section>

        <div class="digital-ticket-total">
          <span>Total Paid</span>
          <strong>${formatTicketCurrency(booking.totalAmount)}</strong>
        </div>

        <p class="qr-security-note">
          Each QR code identifies one individual ticket. Keep each ticket's
          QR code private and present it for admission verification.
        </p>
      </div>

      <footer class="digital-ticket-footer">
        <span>EVENTURE</span>
        <span>Digital Event Tickets</span>
      </footer>
    </article>

    <div class="digital-ticket-actions">
      <button type="button" id="print-ticket-button">
        Print Tickets
      </button>

      <a href="/user/bookings">Back to My Tickets</a>
    </div>

    <div id="ticket-action-message" role="status" aria-live="polite"></div>
  `;

  tickets.forEach((ticket) => {
    const qrContainer = document.getElementById(`ticket-qr-${ticket._id}`);

    if (!qrContainer) return;

    if (ticket.status !== "valid") {
      qrContainer.textContent = "This ticket is no longer valid.";
      return;
    }

    if (typeof QRCode !== "undefined" && ticket.ticketCode) {
      new QRCode(qrContainer, {
        text: ticket.ticketCode,
        width: 180,
        height: 180,
        correctLevel: QRCode.CorrectLevel.M,
      });
    } else {
      qrContainer.textContent = "QR code could not be loaded.";
    }
  });

  document
    .getElementById("print-ticket-button")
    .addEventListener("click", () => window.print());

  attachCancellationHandlers();
  startCancellationCountdown();
};

const attachCancellationHandlers = () => {
  document.querySelectorAll(".cancel-ticket-button").forEach((button) => {
    button.addEventListener("click", async () => {
      const ticketId = button.dataset.ticketId;

      const confirmed = window.confirm(
        "Are you sure you want to request cancellation? You will have 30 minutes to withdraw this request.",
      );

      if (!confirmed) return;

      await performTicketAction(ticketId, "cancel", button);
    });
  });

  document
    .querySelectorAll(".withdraw-cancellation-button")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        const ticketId = button.dataset.ticketId;

        const confirmed = window.confirm(
          "Do you want to withdraw your ticket cancellation request?",
        );

        if (!confirmed) return;

        await performTicketAction(ticketId, "withdraw", button);
      });
    });
};

const performTicketAction = async (ticketId, action, button) => {
  const token = getTicketToken();

  if (!token) {
    window.location.replace("/login");
    return;
  }

  const endpoint =
    action === "cancel"
      ? `${CANCELLATION_BASE_URL}/${encodeURIComponent(ticketId)}/cancel`
      : `${CANCELLATION_BASE_URL}/${encodeURIComponent(ticketId)}/cancel/withdraw`;

  const originalText = button.textContent;

  button.disabled = true;
  button.textContent = action === "cancel" ? "Requesting..." : "Withdrawing...";

  showTicketActionMessage("");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to process your request.");
    }

    showTicketActionMessage(
      result.message || "Request completed successfully.",
    );

    await loadDigitalTicket();
  } catch (error) {
    console.error("Ticket cancellation action error:", error);

    showTicketActionMessage(
      error.message || "Something went wrong. Please try again.",
      true,
    );

    button.disabled = false;
    button.textContent = originalText;
  }
};

const startCancellationCountdown = () => {
  const countdownElements = document.querySelectorAll(
    ".cancellation-countdown",
  );

  if (countdownElements.length === 0) return;

  const updateCountdowns = () => {
    countdownElements.forEach((element) => {
      const expiry = new Date(element.dataset.expiry).getTime();

      if (Number.isNaN(expiry)) {
        element.textContent = "Unavailable";
        return;
      }

      const remaining = expiry - Date.now();

      if (remaining <= 0) {
        element.textContent = "Grace period expired";
        element
          .closest(".ticket-cancellation-status")
          ?.querySelector(".withdraw-cancellation-button")
          ?.remove();

        return;
      }

      element.textContent = formatCountdown(remaining);
    });
  };

  updateCountdowns();

  countdownInterval = setInterval(updateCountdowns, 1000);
};

const showTicketActionMessage = (message, isError = false) => {
  const messageContainer = document.getElementById("ticket-action-message");

  if (!messageContainer) return;

  messageContainer.textContent = message;
  messageContainer.className = isError
    ? "ticket-action-message error"
    : "ticket-action-message success";
};

const showTicketError = (message) => {
  ticketContainer.innerHTML = `
    <div class="digital-ticket-error">
      <h2>Unable to display ticket</h2>
      <p>${escapeTicketHtml(message)}</p>
      <a href="/user/bookings">Back to My Tickets</a>
    </div>
  `;
};

document.addEventListener("DOMContentLoaded", loadDigitalTicket);
