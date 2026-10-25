const eventDetails = document.getElementById("event-details");

const eventId = window.location.pathname.split("/").filter(Boolean).pop();

const getAuthToken = () =>
  sessionStorage.getItem("token") || localStorage.getItem("token");

const escapeHTML = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });

const handleUnauthorized = (message = "Your session has expired.") => {
  Swal.fire({
    icon: "error",
    title: "Authentication required",
    text: message,
    confirmButtonText: "Login",
  }).then(() => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.replace("/login");
  });
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatStatus = (status) => {
  if (!status) return "";

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusClass = (status) => `status-${status}`;

const showMessage = (message, icon = "error") =>
  Swal.fire({
    icon,
    title: icon === "success" ? "Success" : "Unable to continue",
    text: message,
    confirmButtonText: "OK",
  });

const getVideoHTML = (videoUrl) => {
  if (!videoUrl) return "";

  return `
    <div class="event-section promo-video-section">
      <h2>Promotional Video</h2>

      <div class="promo-video-wrapper">
        <video
          class="event-promo-video"
          controls
          preload="metadata"
          playsinline
        >
          <source src="${escapeHTML(videoUrl)}">
          Your browser does not support HTML video.
        </video>
      </div>
    </div>
  `;
};

const submitEvent = async () => {
  const confirmation = await Swal.fire({
    icon: "question",
    title: "Submit event?",
    text: "Once submitted, the event will be sent to the admin for approval.",
    showCancelButton: true,
    confirmButtonText: "Submit",
    cancelButtonText: "Cancel",
  });

  if (!confirmation.isConfirmed) return;

  const submitButton = document.getElementById("submit-event-btn");

  try {
    const token = getAuthToken();

    if (!token) {
      handleUnauthorized("Please login before submitting your event.");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Submitting...";
    }

    const response = await fetch(`/api/host/events/${eventId}/submit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(result.message || "Unauthorized.");
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to submit event.");
    }

    await Swal.fire({
      icon: "success",
      title: "Event submitted",
      text: result.message || "Your event has been submitted for approval.",
      confirmButtonText: "Continue",
    });

    window.location.reload();
  } catch (error) {
    console.error("Submit Event Error:", error);

    showMessage(error.message || "Unable to submit event.");

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Submit for Approval";
    }
  }
};

const requestEventEdit = async () => {
  const confirmation = await Swal.fire({
    icon: "question",
    title: "Request edit permission?",
    text: "Your event will remain visible until the admin reviews your request.",
    showCancelButton: true,
    confirmButtonText: "Request Permission",
    cancelButtonText: "Cancel",
  });

  if (!confirmation.isConfirmed) return;

  const button = document.getElementById("request-edit-btn");

  try {
    const token = getAuthToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    if (button) {
      button.disabled = true;
      button.textContent = "Requesting...";
    }

    const response = await fetch(`/api/host/events/${eventId}/edit-request`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(result.message || "Unauthorized.");
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to request edit permission.");
    }

    await Swal.fire({
      icon: "success",
      title: "Request submitted",
      text:
        result.message || "Your edit permission request has been submitted.",
      confirmButtonText: "Continue",
    });

    await getEventDetails();
  } catch (error) {
    console.error("Request Event Edit Error:", error);

    showMessage(error.message || "Unable to request edit permission.");

    if (button) {
      button.disabled = false;
      button.textContent = "Request Edit Permission";
    }
  }
};

const renderEventActions = (event) => {
  const editStatus = event.editRequestStatus || "none";

  if (event.status === "draft") {
    return `
      <div class="event-actions">
        <a
          href="/host/events/${encodeURIComponent(event._id)}/edit"
          class="edit-event-btn"
        >
          Edit Event
        </a>

        <button
          type="button"
          class="submit-event-btn"
          id="submit-event-btn"
        >
          Submit for Approval
        </button>
      </div>
    `;
  }

  if (event.status === "pending") {
    return `
      <div class="status-message pending-message">
        <strong>Waiting for approval</strong>
        <p>Your event has been submitted and is waiting for admin approval.</p>
      </div>
    `;
  }

  if (event.status === "approved") {
    if (editStatus === "pending") {
      return `
        <div class="status-message pending-message">
          <strong>Edit permission requested</strong>
          <p>Your event remains visible while the admin reviews your request.</p>
        </div>
      `;
    }

    if (editStatus === "editing") {
      return `
        <div class="status-message pending-message">
          <strong>Edit permission approved</strong>
          <p>Your changes will be reviewed by the admin before becoming visible.</p>
        </div>

        <div class="event-actions">
          <a
            href="/host/events/${encodeURIComponent(event._id)}/edit"
            class="edit-event-btn"
          >
            Edit Event
          </a>
        </div>
      `;
    }

    if (editStatus === "review") {
      return `
        <div class="status-message pending-message">
          <strong>Changes awaiting review</strong>
          <p>Your updated event is waiting for admin approval.</p>
        </div>
      `;
    }

    if (editStatus === "rejected" && event.pendingEdit) {
      return `
        <div class="status-message rejected-message">
          <strong>Updated event rejected</strong>
          <p>
            ${escapeHTML(
              event.editReviewRejectionReason ||
                "The admin has requested changes to your updated event.",
            )}
          </p>
          <p>Correct the changes and resubmit your event for review.</p>
        </div>

        <div class="event-actions">
          <a
            href="/host/events/${encodeURIComponent(event._id)}/edit"
            class="edit-event-btn"
          >
            Correct and Resubmit
          </a>
        </div>
      `;
    }

    if (editStatus === "rejected") {
      return `
        <div class="status-message rejected-message">
          <strong>Edit request rejected</strong>
          <p>
            ${escapeHTML(
              event.editRequestRejectionReason ||
                "Your request to edit this event was rejected.",
            )}
          </p>
        </div>

        <div class="event-actions">
          <button
            type="button"
            class="edit-event-btn"
            id="request-edit-btn"
          >
            Request Edit Permission Again
          </button>
        </div>
      `;
    }

    return `
      <div class="status-message approved-message">
        <strong>Event approved</strong>
        <p>Your event has been approved and is visible to attendees.</p>
      </div>

      <div class="event-actions">
        <button
          type="button"
          class="edit-event-btn"
          id="request-edit-btn"
        >
          Request Edit Permission
        </button>
      </div>
    `;
  }

  if (event.status === "rejected") {
    return `
      <div class="status-message rejected-message">
        <strong>Event rejected</strong>
        <p>
          ${escapeHTML(
            event.rejectionReason || "No rejection reason was provided.",
          )}
        </p>
      </div>

      <div class="event-actions">
        <a
          href="/host/events/${encodeURIComponent(event._id)}/edit"
          class="edit-event-btn"
        >
          Edit Event
        </a>
      </div>
    `;
  }

  if (event.status === "cancelled") {
    return `
      <div class="status-message rejected-message">
        <strong>Event cancelled</strong>
        <p>This event has been cancelled.</p>
      </div>
    `;
  }

  if (event.status === "completed") {
    return `
      <div class="status-message approved-message">
        <strong>Event completed</strong>
        <p>This event has already been completed.</p>
      </div>
    `;
  }

  return "";
};

const getEventDetails = async () => {
  try {
    const token = getAuthToken();

    if (!token) {
      handleUnauthorized();
      return;
    }

    const response = await fetch(`/api/host/events/${eventId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      handleUnauthorized(result.message || "Unauthorized.");
      return;
    }

    if (response.status === 404) {
      eventDetails.innerHTML = `
        <div class="event-state-card">
          <div class="event-state-icon">!</div>
          <h2>Event not found</h2>
          <p>The event you are looking for does not exist.</p>
          <a href="/host/events" class="back-events-btn">
            Back to My Events
          </a>
        </div>
      `;
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to fetch event.");
    }

    const event = result.data;

    if (!event) {
      throw new Error("Event data was not returned.");
    }

    const ticketsHTML = event.tickets?.length
      ? event.tickets
          .map(
            (ticket) => `
                <div class="ticket-card">
                  <div class="ticket-header">
                    <h3>${escapeHTML(ticket.name)}</h3>
                  </div>

                  <div class="ticket-info">
                    <div>
                      <span>Price</span>
                      <strong>₹${escapeHTML(ticket.price)}</strong>
                    </div>

                    <div>
                      <span>Quantity</span>
                      <strong>${escapeHTML(ticket.quantity)}</strong>
                    </div>

                    <div>
                      <span>Sold</span>
                      <strong>${escapeHTML(ticket.sold || 0)}</strong>
                    </div>

                    <div>
                      <span>Reserved</span>
                      <strong>${escapeHTML(ticket.reserved || 0)}</strong>
                    </div>

                    <div>
                      <span>Available</span>
                      <strong>${
                        Number(ticket.quantity || 0) -
                        Number(ticket.sold || 0) -
                        Number(ticket.reserved || 0)
                      }</strong>
                    </div>
                  </div>
                </div>
              `,
          )
          .join("")
      : `<div class="empty-tickets">No tickets available.</div>`;

    const location = event.location || {};
    const bookingPolicy = event.bookingPolicy || {};

    const eventHTML = `
      <div class="event-details-card">
        <div class="event-banner-wrapper">
          <img
            src="${escapeHTML(event.banner)}"
            alt="${escapeHTML(event.eventName)}"
            class="event-banner"
          >
        </div>

        <div class="event-content">
          <div class="event-title-row">
            <div>
              <span class="category-label">
                ${escapeHTML(event.category?.name || "Uncategorized")}
              </span>

              <h1>${escapeHTML(event.eventName)}</h1>
            </div>

            <span class="event-status ${getStatusClass(event.status)}">
              ${escapeHTML(formatStatus(event.status))}
            </span>
          </div>

          <div class="event-section">
            <h2>About the Event</h2>
            <p class="event-description">
              ${escapeHTML(event.description)}
            </p>
          </div>

          ${getVideoHTML(event.promoVideo)}

          <div class="event-section">
            <h2>Location</h2>

            <div class="details-grid">
              <div class="detail-item">
                <span>Venue</span>
                <strong>${escapeHTML(location.venue)}</strong>
              </div>

              <div class="detail-item">
                <span>City</span>
                <strong>${escapeHTML(location.city)}</strong>
              </div>

              <div class="detail-item detail-wide">
                <span>Address</span>
                <strong>${escapeHTML(location.address)}</strong>
              </div>

              <div class="detail-item">
                <span>State</span>
                <strong>${escapeHTML(location.state)}</strong>
              </div>

              <div class="detail-item">
                <span>Pincode</span>
                <strong>${escapeHTML(location.pincode)}</strong>
              </div>
            </div>
          </div>

          <div class="event-section">
            <h2>Schedule</h2>

            <div class="details-grid">
              <div class="detail-item">
                <span>Date</span>
                <strong>${formatDate(event.eventDate)}</strong>
              </div>

              <div class="detail-item">
                <span>Time</span>
                <strong>
                  ${escapeHTML(event.startTime)} - ${escapeHTML(event.endTime)}
                </strong>
              </div>
            </div>
          </div>

          <div class="event-section">
            <div class="section-heading-row">
              <div>
                <h2>Tickets</h2>
                <p>Ticket types and current inventory.</p>
              </div>
            </div>

            <div class="tickets-container">
              ${ticketsHTML}
            </div>
          </div>

          <div class="event-section">
            <h2>Booking Settings</h2>

            <div class="booking-setting">
              <span>Booking after event starts</span>
              <strong>
                ${bookingPolicy.allowAfterStart ? "Allowed" : "Not allowed"}
              </strong>
            </div>
          </div>

          <div class="event-section event-actions-section">
            <h2>Event Actions</h2>
            ${renderEventActions(event)}
          </div>
        </div>
      </div>
    `;

    eventDetails.innerHTML = eventHTML;

    document
      .getElementById("submit-event-btn")
      ?.addEventListener("click", submitEvent);

    document
      .getElementById("request-edit-btn")
      ?.addEventListener("click", requestEventEdit);
  } catch (error) {
    console.error("Event Details Page Error:", error);

    eventDetails.innerHTML = `
      <div class="event-state-card">
        <div class="event-state-icon">!</div>
        <h2>Unable to load event</h2>
        <p>
          ${escapeHTML(
            error.message || "Something went wrong while loading the event.",
          )}
        </p>
        <a href="/host/events" class="back-events-btn">
          Back to My Events
        </a>
      </div>
    `;
  }
};

getEventDetails();
