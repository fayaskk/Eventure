const eventsContainer = document.getElementById("events-container");
const eventSearch = document.getElementById("eventSearch");
const statusFilter = document.getElementById("statusFilter");
const clearSearchButton = document.getElementById("clearEventSearch");

let hostEvents = [];

const getAuthToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken")
  );
};

const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();

  if (!token) {
    await Swal.fire({
      icon: "error",
      title: "Authentication required",
      text: "Please login to continue.",
      confirmButtonText: "Login",
    });

    window.location.href = "/login";

    throw new Error("Authentication token not found.");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  return fetch(url, {
    ...options,
    headers,
  });
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatDate = (date) => {
  if (!date) {
    return "Date unavailable";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const capitalizeStatus = (status) => {
  if (!status) {
    return "";
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
};

const getStatusClass = (status) => {
  switch (status) {
    case "draft":
      return "status-draft";

    case "pending":
      return "status-pending";

    case "approved":
      return "status-approved";

    case "rejected":
      return "status-rejected";

    case "cancelled":
      return "status-cancelled";

    case "completed":
      return "status-completed";

    default:
      return "";
  }
};

const updateEventStatistics = () => {
  const total = hostEvents.length;

  const approved = hostEvents.filter(
    (event) => event.status === "approved",
  ).length;

  const pending = hostEvents.filter(
    (event) => event.status === "pending",
  ).length;

  const completed = hostEvents.filter(
    (event) => event.status === "completed",
  ).length;

  document.getElementById("totalEventsCount").textContent = total;
  document.getElementById("approvedEventsCount").textContent = approved;
  document.getElementById("pendingEventsCount").textContent = pending;
  document.getElementById("completedEventsCount").textContent = completed;
};

const getEventActions = (event) => {
  const eventId = encodeURIComponent(event._id);

  const viewButton = `
    <a
      href="/host/events/${eventId}"
      class="event-action-btn view-btn"
    >
      <i class="bi bi-eye"></i>
      View
    </a>
  `;

  const discountButton =
    event.status === "approved"
      ? `
        <a
          href="/host/events/${eventId}/discounts"
          class="event-action-btn discount-btn"
        >
          <i class="bi bi-tag"></i>
          Manage Discounts
        </a>
      `
      : "";

  if (event.status === "draft" || event.status === "rejected") {
    return `
      ${viewButton}

      <a
        href="/host/events/${eventId}/edit"
        class="event-action-btn edit-btn"
      >
        <i class="bi bi-pencil"></i>
        Edit
      </a>

      <button
        type="button"
        class="event-action-btn submit-btn"
        data-event-id="${escapeHtml(event._id)}"
      >
        <i class="bi bi-send"></i>
        ${event.status === "rejected" ? "Resubmit" : "Submit"}
      </button>
    `;
  }

  return `
    ${viewButton}
    ${discountButton}
  `;
};

const createEventCard = (event, index) => {
  const categoryName = event.category?.name || "Uncategorized";

  const city = event.location?.city || "Location unavailable";

  const banner = event.banner || "";

  const statusClass = getStatusClass(event.status);

  const safeBanner = escapeHtml(banner);

  return `
    <article
      class="event-card"
      style="--card-index: ${index}"
    >

      <div class="event-banner-wrapper">

        ${
          banner
            ? `
              <img
                src="${safeBanner}"
                alt=""
                class="event-banner-backdrop"
                aria-hidden="true"
              >

              <img
                src="${safeBanner}"
                alt="${escapeHtml(event.eventName)}"
                class="event-banner"
                loading="lazy"
                onerror="this.style.display='none'; this.parentElement.classList.add('event-image-unavailable');"
              >
            `
            : `
              <div class="event-banner-placeholder">
                <i class="bi bi-image"></i>
                <span>No event banner available</span>
              </div>
            `
        }

      </div>

      <div class="event-card-content">

        <div class="event-card-top">

          <span class="event-category">
            ${escapeHtml(categoryName)}
          </span>

          <span class="event-status ${statusClass}">
            ${escapeHtml(capitalizeStatus(event.status))}
          </span>

        </div>

        <h3 class="event-title">
          ${escapeHtml(event.eventName)}
        </h3>

        <div class="event-info">

          <div class="event-info-item">

            <span class="info-label">
              Location
            </span>

            <span class="info-value">
              ${escapeHtml(city)}
            </span>

          </div>

          <div class="event-info-item">

            <span class="info-label">
              Date
            </span>

            <span class="info-value">
              ${formatDate(event.eventDate)}
            </span>

          </div>

          <div class="event-info-item">

            <span class="info-label">
              Time
            </span>

            <span class="info-value">
              ${escapeHtml(event.startTime || "--:--")}
              -
              ${escapeHtml(event.endTime || "--:--")}
            </span>

          </div>

        </div>

        ${
          event.status === "rejected" && event.rejectionReason
            ? `
              <div class="rejection-message">
                <strong>Rejection reason:</strong>
                ${escapeHtml(event.rejectionReason)}
              </div>
            `
            : ""
        }

        <div class="event-actions">
          ${getEventActions(event)}
        </div>

      </div>

    </article>
  `;
};

const renderEvents = () => {
  const searchValue = eventSearch.value.trim().toLowerCase();

  const selectedStatus = statusFilter.value;

  const filteredEvents = hostEvents.filter((event) => {
    const eventName = event.eventName?.toLowerCase() || "";

    const city = event.location?.city?.toLowerCase() || "";

    const category = event.category?.name?.toLowerCase() || "";

    const matchesSearch =
      eventName.includes(searchValue) ||
      city.includes(searchValue) ||
      category.includes(searchValue);

    const matchesStatus =
      selectedStatus === "all" || event.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const resultCount = document.getElementById("eventsResultCount");

  if (resultCount) {
    resultCount.textContent = `${filteredEvents.length} ${
      filteredEvents.length === 1 ? "Event" : "Events"
    }`;
  }

  if (clearSearchButton) {
    clearSearchButton.hidden = !searchValue;
  }

  if (filteredEvents.length === 0) {
    eventsContainer.innerHTML = `
      <div class="empty-events">

        <div class="empty-events-icon">
          <i class="bi bi-calendar-x"></i>
        </div>

        <h3>No events found</h3>

        <p>
          No events match your current search or filter.
        </p>

      </div>
    `;

    return;
  }

  eventsContainer.innerHTML = `
    <div class="events-grid">
      ${filteredEvents
        .map((event, index) => createEventCard(event, index))
        .join("")}
    </div>
  `;

  attachSubmitListeners();
};

const submitEvent = async (eventId) => {
  const confirmation = await Swal.fire({
    icon: "question",
    title: "Submit event for approval?",
    text: "Once submitted, you will not be able to edit the event until it is reviewed.",
    showCancelButton: true,
    confirmButtonText: "Submit",
    cancelButtonText: "Cancel",
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  try {
    const response = await authenticatedFetch(
      `/api/host/events/${encodeURIComponent(eventId)}/submit`,
      {
        method: "POST",
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

    if (!response.ok) {
      throw new Error(result.message || "Unable to submit event.");
    }

    await Swal.fire({
      icon: "success",
      title: "Event submitted",
      text: result.message || "Your event has been submitted for approval.",
      confirmButtonText: "OK",
    });

    await getHostEvents();
  } catch (error) {
    console.error("Submit event error:", error);

    if (error.message !== "Authentication token not found.") {
      await Swal.fire({
        icon: "error",
        title: "Submission failed",
        text: error.message || "Unable to submit event.",
      });
    }
  }
};

const attachSubmitListeners = () => {
  document.querySelectorAll(".submit-btn").forEach((button) => {
    button.addEventListener("click", () => {
      submitEvent(button.dataset.eventId);
    });
  });
};

const getHostEvents = async () => {
  try {
    eventsContainer.innerHTML = `
      <div class="events-message">

        <div class="loading-spinner"></div>

        <p>Loading your events...</p>

      </div>
    `;

    const response = await authenticatedFetch("/api/host/events", {
      method: "GET",
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
      throw new Error(result.message || "Failed to fetch events.");
    }

    hostEvents = Array.isArray(result.data) ? result.data : [];

    updateEventStatistics();

    renderEvents();
  } catch (error) {
    console.error("Events page error:", error);

    if (error.message === "Authentication token not found.") {
      return;
    }

    eventsContainer.innerHTML = `
      <div class="events-error">

        <h3>Unable to load events</h3>

        <p>
          ${escapeHtml(error.message)}
        </p>

        <button
          type="button"
          id="retryEventsBtn"
          class="retry-btn"
        >
          Try Again
        </button>

      </div>
    `;

    document
      .getElementById("retryEventsBtn")
      ?.addEventListener("click", getHostEvents);
  }
};

eventSearch.addEventListener("input", renderEvents);

statusFilter.addEventListener("change", renderEvents);

clearSearchButton?.addEventListener("click", () => {
  eventSearch.value = "";

  renderEvents();

  eventSearch.focus();
});

document.addEventListener("DOMContentLoaded", () => {
  getHostEvents();
});