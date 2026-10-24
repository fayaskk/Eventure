const ticketContainer = document.getElementById("digital-ticket-container");

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

    if (!response.ok || !result.success || !result.booking) {
      throw new Error(result.message || "Unable to load your digital ticket.");
    }

    renderDigitalTicket(result.booking);
  } catch (error) {
    console.error("Digital Ticket Error:", error);
    showTicketError(error.message || "Unable to load your ticket.");
  }
};

const renderDigitalTicket = (booking) => {
  const event = booking.event || {};
  const tickets = Array.isArray(booking.tickets) ? booking.tickets : [];

  if (
    booking.bookingStatus !== "confirmed" ||
    booking.paymentStatus !== "successful"
  ) {
    showTicketError("This booking does not have a valid confirmed ticket.");
    return;
  }

  const ticketRows = tickets
    .map(
      (ticket) => `
        <div class="digital-ticket-row">
          <div>
            <span class="ticket-row-label">
              ${escapeTicketHtml(ticket.ticketName || "Ticket")}
            </span>
            <strong>× ${Number(ticket.quantity) || 0}</strong>
          </div>

          <strong>${formatTicketCurrency(ticket.subtotal)}</strong>
        </div>
      `,
    )
    .join("");

  ticketContainer.innerHTML = `
    <article class="digital-ticket-card">
      <div class="digital-ticket-banner">
        <img
          src="${escapeTicketHtml(event.banner || "")}"
          alt="${escapeTicketHtml(event.eventName || "Event")}"
        >

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
            <strong>${escapeTicketHtml(event.location?.venue || "Unavailable")}</strong>
          </div>

          <div class="digital-ticket-info">
            <span>Location</span>
            <strong>
              ${escapeTicketHtml(event.location?.city || "")}
              ${event.location?.state ? `, ${escapeTicketHtml(event.location.state)}` : ""}
            </strong>
          </div>
        </section>

        <section class="digital-ticket-items">
          <h3>Your Tickets</h3>
          ${ticketRows}
        </section>

        <div class="digital-ticket-total">
          <span>Total Paid</span>
          <strong>${formatTicketCurrency(booking.totalAmount)}</strong>
        </div>

        <div class="digital-ticket-divider"></div>

        <section class="digital-ticket-qr-section">
          <h3>Your Booking QR Code</h3>
          <p>
            Keep this code ready for ticket verification at the event entrance.
          </p>

          <div id="ticket-qr-code" class="ticket-qr-code"></div>

          <span class="qr-booking-reference">
            ${escapeTicketHtml(booking.bookingReference || "Unavailable")}
          </span>

          <p class="qr-security-note">
            This QR identifies your booking. Entry must be validated by the
            event's ticket verification system.
          </p>
        </section>
      </div>

      <footer class="digital-ticket-footer">
        <span>EVENTURE</span>
        <span>Digital Event Ticket</span>
      </footer>
    </article>

    <div class="digital-ticket-actions">
      <button type="button" id="print-ticket-button">
        Print Ticket
      </button>

      <a href="/user/bookings">Back to My Tickets</a>
    </div>
  `;

  const qrContainer = document.getElementById("ticket-qr-code");

  if (typeof QRCode !== "undefined") {
    new QRCode(qrContainer, {
      text: JSON.stringify({
        bookingReference: booking.bookingReference,
      }),
      width: 200,
      height: 200,
      correctLevel: QRCode.CorrectLevel.M,
    });
  } else {
    qrContainer.textContent = "QR code could not be loaded.";
  }

  document
    .getElementById("print-ticket-button")
    .addEventListener("click", () => window.print());
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
