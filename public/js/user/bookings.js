const getBookingsToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken")
  );
};

const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatDate = (date) => {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

const loadMyTickets = async () => {
  const container = document.getElementById("tickets-container");
  const ticketCount = document.getElementById("ticket-count");

  try {
    const token = getBookingsToken();

    if (!token) {
      window.location.replace("/login");
      return;
    }

    const response = await fetch("/api/users/bookings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");

      window.location.replace("/login");
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load tickets.");
    }

    const bookings = Array.isArray(result.bookings)
      ? result.bookings
      : Array.isArray(result.data)
        ? result.data
        : [];

    const confirmedBookings = bookings.filter(
      (booking) =>
        booking.bookingStatus === "confirmed" &&
        booking.paymentStatus === "successful",
    );

    ticketCount.textContent = `${confirmedBookings.length} confirmed booking(s)`;

    renderTickets(confirmedBookings, container);
  } catch (error) {
    console.error("My Tickets Error:", error);

    ticketCount.textContent = "Unable to load tickets";

    container.innerHTML = `
      <div class="tickets-message tickets-error">
        <h3>Something went wrong</h3>
        <p>We couldn't load your tickets. Please try again.</p>
        <button type="button" id="retryTickets">Try Again</button>
      </div>
    `;

    document
      .getElementById("retryTickets")
      ?.addEventListener("click", loadMyTickets);
  }
};

const renderTickets = (bookings, container) => {
  if (bookings.length === 0) {
    container.innerHTML = `
      <div class="tickets-message">
        <div class="empty-ticket-icon">🎟️</div>
        <h3>No confirmed tickets yet</h3>
        <p>
          Once your payment is successful, your tickets will appear here.
        </p>
        <a href="/events" class="explore-button">Explore Events</a>
      </div>
    `;

    return;
  }

  const sortedBookings = [...bookings].sort(
    (first, second) =>
      new Date(second.created_at || second.createdAt || 0) -
      new Date(first.created_at || first.createdAt || 0),
  );

  container.innerHTML = sortedBookings
    .map((booking) => {
      const event = booking.event || {};
      const tickets = Array.isArray(booking.tickets) ? booking.tickets : [];

      const ticketSummary = tickets
        .map(
          (ticket) =>
            `${escapeHtml(ticket.ticketName || "Ticket")} × ${Number(ticket.quantity) || 0}`,
        )
        .join(", ");

      const bookingId = encodeURIComponent(booking._id);

      return `
        <article class="ticket-card">
          <div class="ticket-card-main">
            <div class="ticket-event-details">
              <span class="ticket-confirmed">✓ Booking Confirmed</span>

              <h3>${escapeHtml(event.eventName || "Event unavailable")}</h3>

              <p class="ticket-date">
                📅 ${formatDate(event.eventDate)}
              </p>

              <p class="ticket-location">
                📍 ${escapeHtml(event.location?.city || "Location unavailable")}
              </p>

              <p class="ticket-types">
                🎟️ ${ticketSummary || "Ticket details unavailable"}
              </p>

              <p class="ticket-reference">
                Booking Reference:
                <strong>${escapeHtml(booking.bookingReference || "Unavailable")}</strong>
              </p>
            </div>

            <div class="ticket-payment-details">
              <span class="payment-label">Amount Paid</span>

              <strong class="ticket-amount">
                ${formatCurrency(booking.totalAmount)}
              </strong>

              <span class="payment-success">Payment Successful</span>
            </div>
          </div>

          <div class="ticket-card-footer">
            <a
              href="/user/tickets/${bookingId}"
              class="view-ticket-button"
            >
              View Ticket & QR
            </a>

            <a
              href="/events/${encodeURIComponent(event._id || "")}"
              class="view-event-button"
            >
              View Event
            </a>
          </div>
        </article>
      `;
    })
    .join("");
};

document.addEventListener("DOMContentLoaded", loadMyTickets);
