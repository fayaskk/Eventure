const eventDetails = document.getElementById("event-details");

const eventId = window.location.pathname.split("/").filter(Boolean).at(-1);

const getAuthToken = () =>
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken") ||
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken");

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const getAvailableQuantity = (ticket) => {
  const quantity = Number(ticket.quantity) || 0;
  const reserved = Number(ticket.reserved) || 0;
  const sold = Number(ticket.sold) || 0;

  return Math.max(0, quantity - reserved - sold);
};

const getEventDetails = async () => {
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`);

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load event.");
    }

    const event = result.event || result.data;

    if (!event) {
      throw new Error("Event details are unavailable.");
    }

    renderEventDetails(event);
  } catch (error) {
    console.error("Event Details Error:", error);

    eventDetails.innerHTML = `
      <div class="error-state">
        <h2>Unable to load event</h2>
        <p>${escapeHtml(error.message)}</p>
        <a href="/events" class="back-events-btn">Back to Events</a>
      </div>
    `;
  }
};

const renderEventDetails = (event) => {
  const parsedDate = new Date(event.eventDate);

  const eventDate = Number.isNaN(parsedDate.getTime())
    ? "Date unavailable"
    : parsedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  const tickets = Array.isArray(event.tickets) ? event.tickets : [];
  const location = event.location || {};

  eventDetails.innerHTML = `
    <article class="event-page">
      <div class="event-hero">
        <img
          src="${escapeHtml(event.banner)}"
          alt=""
          class="event-banner-background"
        >

        <img
          src="${escapeHtml(event.banner)}"
          alt="${escapeHtml(event.eventName)}"
          class="event-banner"
        >
      </div>

      <section class="event-content">
        <div class="event-header">
          <div>
            <span class="event-category">
              ${escapeHtml(event.category?.name || "Event")}
            </span>

            <h1>${escapeHtml(event.eventName)}</h1>
          </div>

          <span class="event-status">
            ${escapeHtml(event.status)}
          </span>
        </div>

<section class="event-section">
  <h2>About the Event</h2>
  <p class="event-description">
    ${escapeHtml(event.description)}
  </p>
</section>

${
  event.promoVideo
    ? `
      <section class="event-section promo-video-section">
        <h2>Event Promo Video</h2>
        <p class="promo-video-description">
          Get a preview of the experience waiting for you.
        </p>

        <div class="promo-video-wrapper">
          <video
            controls
            preload="metadata"
            playsinline
          >
            <source
              src="${escapeHtml(event.promoVideo)}"
              type="video/mp4"
            >
            Your browser does not support HTML video.
          </video>
        </div>
      </section>
    `
    : ""
}

        <section class="event-section">
          <h2>Location</h2>

          <div class="info-grid">
            <div class="info-card">
              <span>Venue</span>
              <strong>${escapeHtml(location.venue)}</strong>
            </div>

            <div class="info-card">
              <span>Address</span>
              <strong>${escapeHtml(location.address)}</strong>
            </div>

            <div class="info-card">
              <span>City</span>
              <strong>${escapeHtml(location.city)}</strong>
            </div>

            <div class="info-card">
              <span>State</span>
              <strong>${escapeHtml(location.state)}</strong>
            </div>

            <div class="info-card">
              <span>Pincode</span>
              <strong>${escapeHtml(location.pincode)}</strong>
            </div>
          </div>
        </section>

        <section class="event-section">
          <h2>Schedule</h2>

          <div class="info-grid">
            <div class="info-card">
              <span>Event Date</span>
              <strong>${eventDate}</strong>
            </div>

            <div class="info-card">
              <span>Start Time</span>
              <strong>${escapeHtml(event.startTime)}</strong>
            </div>

            <div class="info-card">
              <span>End Time</span>
              <strong>${escapeHtml(event.endTime)}</strong>
            </div>
          </div>
        </section>

        <section class="event-section">
          <div class="section-heading">
            <div>
              <h2>Tickets</h2>
              <p>Select a ticket type to continue.</p>
            </div>
          </div>

          <div class="tickets-container">
            ${
              tickets.length === 0
                ? `
                  <div class="empty-tickets">
                    Tickets are currently unavailable.
                  </div>
                `
                : tickets
                    .map((ticket) => {
                      const available = getAvailableQuantity(ticket);

                      return `
                        <div class="ticket-card">
                          <div class="ticket-info">
                            <h3>${escapeHtml(ticket.name)}</h3>

                            <p class="ticket-price">
                              ₹${Number(ticket.price).toLocaleString("en-IN")}
                            </p>

                            <p class="ticket-availability">
                              ${
                                available > 0
                                  ? `${available} tickets available`
                                  : "Sold out"
                              }
                            </p>
                          </div>

                          <div class="ticket-action">
                            ${
                              available > 0
                                ? `
                                  <button
                                    type="button"
                                    class="book-ticket-btn"
                                    data-ticket-id="${escapeHtml(ticket._id)}"
                                  >
                                    Book Now
                                  </button>
                                `
                                : `
                                  <button
                                    type="button"
                                    class="book-ticket-btn disabled"
                                    disabled
                                  >
                                    Sold Out
                                  </button>
                                `
                            }
                          </div>
                        </div>
                      `;
                    })
                    .join("")
            }
          </div>
        </section>

        <section class="booking-section">
          <h2>Ready to attend?</h2>
          <p>Select your ticket and continue to booking.</p>

          <button
            type="button"
            id="bookNowBtn"
            class="primary-book-btn"
            ${
              tickets.length === 0 ||
              tickets.every((ticket) => getAvailableQuantity(ticket) === 0)
                ? "disabled"
                : ""
            }
          >
            Book Tickets
          </button>
        </section>
<section class="report-event-section">
  <div class="report-event-content">
    <h3 class="report-event-title">Something wrong with this event?</h3>
    <p class="report-event-description">
      Help us keep Eventure safe by reporting misleading or suspicious events.
    </p>
  </div>

  <button
    type="button"
    id="report-event-btn"
    class="report-event-btn"
  >
    <i class="bi bi-flag"></i>
    Report Event
  </button>
</section>
      </section>
    </article>
  `;
};

const handleBooking = () => {
  if (!getAuthToken()) {
    window.location.href = `/login?redirect=${encodeURIComponent(
      `/events/${eventId}`,
    )}`;

    return;
  }

  window.location.href = `/booking/${eventId}`;
};

const submitEventReport = async () => {
  const token = getAuthToken();

  if (!token) {
    const result = await Swal.fire({
      icon: "info",
      title: "Login Required",
      text: "Please log in to report this event.",
      showCancelButton: true,
      confirmButtonText: "Login",
      cancelButtonText: "Cancel",
    });

    if (result.isConfirmed) {
      window.location.href = `/login?redirect=${encodeURIComponent(
        `/events/${eventId}`,
      )}`;
    }

    return;
  }

  const result = await Swal.fire({
    title: "Report Event",
    html: `
      <div style="text-align:left">
        <label for="report-reason">Reason for reporting</label>

        <select
          id="report-reason"
          class="swal2-select"
          style="width:100%;margin:10px 0"
        >
          <option value="">Select a reason</option>
          <option value="Misleading information">Misleading information</option>
          <option value="Suspicious or fraudulent event">Suspicious or fraudulent event</option>
          <option value="Incorrect event details">Incorrect event details</option>
          <option value="Inappropriate content">Inappropriate content</option>
          <option value="Other">Other</option>
        </select>

        <label for="report-description">
          Additional details (optional)
        </label>

        <textarea
          id="report-description"
          class="swal2-textarea"
          placeholder="Explain the issue..."
          maxlength="1000"
          style="width:100%;margin:10px 0 0"
        ></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Submit Report",
    cancelButtonText: "Cancel",
    focusConfirm: false,
    preConfirm: () => {
      const reason = document.getElementById("report-reason").value;
      const description = document
        .getElementById("report-description")
        .value.trim();

      if (!reason) {
        Swal.showValidationMessage("Please select a reason.");
        return false;
      }

      if (description.length > 1000) {
        Swal.showValidationMessage(
          "Description cannot exceed 1000 characters.",
        );
        return false;
      }

      return { reason, description };
    },
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    Swal.fire({
      title: "Submitting Report",
      text: "Please wait...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => Swal.showLoading(),
    });

    const response = await fetch(
      `/api/events/${encodeURIComponent(eventId)}/report`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(result.value),
      },
    );

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      Swal.close();

      await Swal.fire({
        icon: "warning",
        title: "Authentication Required",
        text: data.message || "Please log in again to report this event.",
      });

      return;
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Unable to submit your report.");
    }

    await Swal.fire({
      icon: "success",
      title: "Report Submitted",
      text: "Thank you. Our team will review this event.",
      confirmButtonText: "OK",
    });
  } catch (error) {
    console.error("Event Report Error:", error);

    await Swal.fire({
      icon: "error",
      title: "Report Failed",
      text: error.message || "Unable to submit your report.",
    });
  }
};

document.addEventListener("click", (event) => {
  const ticketButton = event.target.closest(".book-ticket-btn");

  if (ticketButton && !ticketButton.disabled) {
    handleBooking();
    return;
  }

  if (event.target.closest("#bookNowBtn")) {
    handleBooking();
    return;
  }

  if (event.target.closest("#report-event-btn")) {
    submitEventReport();
  }
});

getEventDetails();
