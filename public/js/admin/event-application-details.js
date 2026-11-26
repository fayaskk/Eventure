const token = sessionStorage.getItem("token") || localStorage.getItem("token");

const eventDetails = document.getElementById("event-details");

const eventId = window.location.pathname.split("/").at(-1);

const getEventDetails = async () => {
  try {
    const response = await fetch(`/api/admin/events/${eventId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      window.location.replace("/login");

      return;
    }

    if (response.status === 404) {
      eventDetails.innerHTML = `
        <div class="error-state">
          <h2>Event Not Found</h2>
          <p>This event application could not be found.</p>
          <a href="/admin/event-applications" class="primary-btn">
            Back to Applications
          </a>
        </div>
      `;

      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch event.");
    }

    const event = result.event;

    const promoVideoHTML = event.promoVideo
      ? `
        <section class="event-section">

          <h3>Promotional Video</h3>

          <p class="promo-video-description">
            Promotional video submitted by the host.
          </p>

          <div class="promo-video-wrapper">
            <video
              controls
              preload="metadata"
              playsinline
            >
              <source src="${event.promoVideo}" type="video/mp4">
              Your browser does not support video playback.
            </video>
          </div>

        </section>
      `
      : `
        <section class="event-section">

          <h3>Promotional Video</h3>

          <p class="no-promo-video">
            No promotional video was submitted for this event.
          </p>

        </section>
      `;

    const ticketsHTML = (event.tickets || [])
      .map((ticket) => {
        const available = ticket.quantity - ticket.sold - ticket.reserved;

        return `
          <article class="ticket-card">

            <div class="ticket-header">
              <h4>${ticket.name}</h4>
            </div>

            <div class="ticket-info">

              <div class="ticket-info-item">
                <span>Price</span>
                <strong>₹${ticket.price}</strong>
              </div>

              <div class="ticket-info-item">
                <span>Quantity</span>
                <strong>${ticket.quantity}</strong>
              </div>

              <div class="ticket-info-item">
                <span>Sold</span>
                <strong>${ticket.sold}</strong>
              </div>

              <div class="ticket-info-item">
                <span>Reserved</span>
                <strong>${ticket.reserved}</strong>
              </div>

              <div class="ticket-info-item">
                <span>Available</span>
                <strong>${available}</strong>
              </div>

            </div>

          </article>
        `;
      })
      .join("");

    let actionHTML = "";

    if (event.status === "pending") {
      actionHTML = `
        <section class="event-section action-section">

          <div>
            <h3>Review Application</h3>

            <p>
              Approve this event to make it available
              on the Eventure platform, or reject it
              with a reason.
            </p>
          </div>

          <div class="action-buttons">

            <button
              type="button"
              id="reject-event-btn"
              class="reject-btn"
            >
              Reject Event
            </button>

            <button
              type="button"
              id="approve-event-btn"
              class="approve-btn"
            >
              Approve Event
            </button>

          </div>

        </section>
      `;
    }

    if (event.status === "approved") {
      actionHTML = `
        <section class="event-section">

          <div class="status-message approved-message">
            <strong>Event Approved</strong>

            <p>
              This event has been approved and is now
              available on the Eventure platform.
            </p>
          </div>

        </section>
      `;
    }

    if (event.status === "rejected") {
      actionHTML = `
        <section class="event-section">

          <div class="status-message rejected-message">
            <strong>Event Rejected</strong>

            <p>
              <strong>Reason:</strong>
              ${event.rejectionReason || "No reason provided."}
            </p>
          </div>

        </section>
      `;
    }

    eventDetails.innerHTML = `
      <article class="event-review-card">

        <div class="event-banner-wrapper">

          <img
            src="${event.banner}"
            alt="${event.eventName}"
            class="event-banner"
          >

        </div>

        <div class="event-body">

          <section class="event-section event-heading-section">

            <div class="event-title-row">

              <div>
                <span class="event-category">
                  ${event.category?.name || "Uncategorized"}
                </span>

                <h2 class="event-name">
                  ${event.eventName}
                </h2>
              </div>

              <span class="status-badge status-${event.status}">
                ${event.status}
              </span>

            </div>

          </section>

          <section class="event-section">

            <h3>About the Event</h3>

            <p class="description">
              ${event.description}
            </p>

          </section>

          ${promoVideoHTML}

          <section class="event-section">

            <h3>Host Information</h3>

            <div class="info-grid">

              <div class="info-item">
                <span>Host Name</span>
                <strong>${event.host?.name || "Not available"}</strong>
              </div>

              <div class="info-item">
                <span>Host Email</span>
                <strong>${event.host?.email || "Not available"}</strong>
              </div>

            </div>

          </section>

          <section class="event-section">

            <h3>Location</h3>

            <div class="info-grid">

              <div class="info-item">
                <span>Venue</span>
                <strong>${event.location?.venue || "Not specified"}</strong>
              </div>

              <div class="info-item">
                <span>Address</span>
                <strong>${event.location?.address || "Not specified"}</strong>
              </div>

              <div class="info-item">
                <span>City</span>
                <strong>${event.location?.city || "Not specified"}</strong>
              </div>

              <div class="info-item">
                <span>State</span>
                <strong>${event.location?.state || "Not specified"}</strong>
              </div>

              <div class="info-item">
                <span>Pincode</span>
                <strong>${event.location?.pincode || "Not specified"}</strong>
              </div>

            </div>

          </section>

          <section class="event-section">

            <h3>Schedule</h3>

            <div class="info-grid">

              <div class="info-item">
                <span>Event Date</span>
                <strong>
                  ${
                    event.eventDate
                      ? new Date(event.eventDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not specified"
                  }
                </strong>
              </div>

              <div class="info-item">
                <span>Start Time</span>
                <strong>${event.startTime || "Not specified"}</strong>
              </div>

              <div class="info-item">
                <span>End Time</span>
                <strong>${event.endTime || "Not specified"}</strong>
              </div>

            </div>

          </section>

          <section class="event-section">

            <h3>Tickets</h3>

            <p>Ticket types and inventory.</p>

            <div class="tickets-grid">
              ${ticketsHTML || "<p>No ticket types available.</p>"}
            </div>

          </section>

          <section class="event-section">

            <h3>Booking Settings</h3>

            <div class="booking-setting">

              <span>Booking after event starts</span>

              <strong>
                ${
                  event.bookingPolicy?.allowAfterStart
                    ? "Allowed"
                    : "Not Allowed"
                }
              </strong>

            </div>

          </section>

          ${actionHTML}

        </div>

      </article>
    `;

    const approveButton = document.getElementById("approve-event-btn");
    const rejectButton = document.getElementById("reject-event-btn");

    if (approveButton) {
      approveButton.addEventListener("click", approveEvent);
    }

    if (rejectButton) {
      rejectButton.addEventListener("click", rejectEvent);
    }
  } catch (error) {
    console.error("Admin Event Details Error:", error);

    eventDetails.innerHTML = `
      <div class="error-state">
        <h2>Unable to Load Event</h2>
        <p>${error.message}</p>
      </div>
    `;
  }
};

const approveEvent = async () => {
  const confirmation = await Swal.fire({
    title: "Approve Event?",
    text: "This event will become available on Eventure.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Yes, Approve",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#5146d8",
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/events/${eventId}/approve`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      window.location.replace("/login");
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to approve event.");
    }

    await Swal.fire({
      title: "Event Approved",
      text: "The event has been approved successfully.",
      icon: "success",
      confirmButtonText: "Continue",
      confirmButtonColor: "#5146d8",
    });

    window.location.href = "/admin/event-applications";
  } catch (error) {
    console.error("Approve Event Error:", error);

    Swal.fire({
      title: "Approval Failed",
      text: error.message || "Unable to approve the event.",
      icon: "error",
      confirmButtonColor: "#5146d8",
    });
  }
};

const rejectEvent = async () => {
  const result = await Swal.fire({
    title: "Reject Event",
    input: "textarea",
    inputLabel: "Rejection Reason",
    inputPlaceholder: "Enter the reason for rejecting this event...",
    inputAttributes: {
      "aria-label": "Rejection reason",
    },
    showCancelButton: true,
    confirmButtonText: "Reject Event",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#d92d20",

    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return "Please provide a rejection reason.";
      }

      if (value.trim().length < 5) {
        return "Rejection reason must be at least 5 characters.";
      }

      return undefined;
    },
  });

  if (!result.isConfirmed) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/events/${eventId}/reject`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rejectionReason: result.value.trim(),
      }),
    });

    const responseData = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      window.location.replace("/login");
      return;
    }

    if (!response.ok || !responseData.success) {
      throw new Error(responseData.message || "Failed to reject event.");
    }

    await Swal.fire({
      title: "Event Rejected",
      text: "The event has been rejected.",
      icon: "success",
      confirmButtonText: "Continue",
      confirmButtonColor: "#5146d8",
    });

    window.location.href = "/admin/event-applications";
  } catch (error) {
    console.error("Reject Event Error:", error);

    Swal.fire({
      title: "Rejection Failed",
      text: error.message || "Unable to reject the event.",
      icon: "error",
      confirmButtonColor: "#5146d8",
    });
  }
};

getEventDetails();
