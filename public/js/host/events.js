const eventsContainer = document.getElementById("events-container");
const eventSearch = document.getElementById("eventSearch");
const statusFilter = document.getElementById("statusFilter");

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

const formatDate = (date) => {
  if (!date) {
    return "Date not available";
  }

  return new Date(date).toLocaleDateString("en-IN", {
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

const getEventActions = (event) => {
  const viewButton = `
    <a
      href="/host/events/${event._id}"
      class="event-action-btn view-btn"
    >
      View
    </a>
  `;

  if (event.status === "draft") {
    return `
      ${viewButton}

      <a
        href="/host/events/${event._id}/edit"
        class="event-action-btn edit-btn"
      >
        Edit
      </a>

      <button
        type="button"
        class="event-action-btn submit-btn"
        data-event-id="${event._id}"
      >
        Submit
      </button>
    `;
  }

  if (event.status === "rejected") {
    return `
      ${viewButton}

      <a
        href="/host/events/${event._id}/edit"
        class="event-action-btn edit-btn"
      >
        Edit
      </a>

      <button
        type="button"
        class="event-action-btn submit-btn"
        data-event-id="${event._id}"
      >
        Resubmit
      </button>
    `;
  }

  return viewButton;
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
      selectedStatus === "all" ||
      event.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  if (filteredEvents.length === 0) {
    eventsContainer.innerHTML = `
      <div class="empty-events">

        <div class="empty-events-icon">
          📅
        </div>

        <h3>No events found</h3>

        <p>
          No events match your current search or filter.
        </p>

      </div>
    `;

    return;
  }

  eventsContainer.innerHTML = filteredEvents
    .map((event) => {
      const categoryName =
        event.category?.name || "Uncategorized";

      const city =
        event.location?.city || "Location unavailable";

      const statusClass =
        getStatusClass(event.status);

      return `
        <article class="event-card">

          <div class="event-banner-wrapper">

            <img
              src="${escapeHtml(event.banner)}"
              alt="${escapeHtml(event.eventName)}"
              class="event-banner"
            >

          </div>

          <div class="event-card-content">

            <div class="event-card-top">

              <span class="event-category">
                ${escapeHtml(categoryName)}
              </span>

              <span class="event-status ${statusClass}">
                ${capitalizeStatus(event.status)}
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
              event.status === "rejected" &&
              event.rejectionReason
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
    })
    .join("");

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
      `/api/host/events/${eventId}/submit`,
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
      throw new Error(
        result.message || "Unable to submit event.",
      );
    }

    await Swal.fire({
      icon: "success",
      title: "Event submitted",
      text:
        result.message ||
        "Your event has been submitted for approval.",
      confirmButtonText: "OK",
    });

    await getHostEvents();
  } catch (error) {
    console.error("Submit event error:", error);

    if (
      error.message !==
      "Authentication token not found."
    ) {
      showMessage(
        error.message || "Unable to submit event.",
        "error",
      );
    }
  }
};

const attachSubmitListeners = () => {
  const submitButtons =
    document.querySelectorAll(".submit-btn");

  submitButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const eventId = button.dataset.eventId;

      submitEvent(eventId);
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

    const response = await authenticatedFetch(
      "/api/host/events",
      {
        method: "GET",
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
      throw new Error(
        result.message || "Failed to fetch events.",
      );
    }

    if (!result.success) {
      throw new Error(
        result.message || "Events are not available.",
      );
    }

    hostEvents = Array.isArray(result.data)
      ? result.data
      : [];

    renderEvents();
  } catch (error) {
    console.error("Events page error:", error);

    if (
      error.message ===
      "Authentication token not found."
    ) {
      return;
    }

    eventsContainer.innerHTML = `
      <div class="events-error">

        <h3>Unable to load events</h3>

        <p>
          ${
            escapeHtml(error.message) ||
            "Something went wrong while loading your events."
          }
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

getHostEvents();