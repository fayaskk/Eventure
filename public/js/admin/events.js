const eventsTableContainer = document.getElementById("eventsTableContainer");
const eventsPagination = document.getElementById("eventsPagination");
const eventsResultCount = document.getElementById("eventsResultCount");
const eventFilters = document.getElementById("eventFilters");
const eventSearch = document.getElementById("eventSearch");
const eventStatus = document.getElementById("eventStatus");
const refreshEventsButton = document.getElementById("refreshEvents");
const clearFiltersButton = document.getElementById("clearFilters");

let currentPage = 1;
let totalPages = 1;
let isLoading = false;

const getAdminToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken");

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

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

const showNotification = async (message, type = "info") => {
  if (typeof window.showMessage === "function") {
    await window.showMessage(message, type);
    return;
  }

  if (window.Swal) {
    await Swal.fire({
      icon: type,
      text: message,
      confirmButtonColor: "#5945e5",
    });
  }
};

const updateSummaryCards = (counts = {}) => {
  document.getElementById("totalEvents").textContent = counts.total ?? 0;
  document.getElementById("pendingEvents").textContent = counts.pending ?? 0;
  document.getElementById("approvedEvents").textContent = counts.approved ?? 0;
  document.getElementById("completedEvents").textContent =
    counts.completed ?? 0;
  document.getElementById("cancelledEvents").textContent =
    counts.cancelled ?? 0;
  document.getElementById("hiddenEvents").textContent = counts.hidden ?? 0;
};

const getStatusClass = (status) => {
  const allowedStatuses = [
    "draft",
    "pending",
    "approved",
    "rejected",
    "cancelled",
    "completed",
  ];

  return allowedStatuses.includes(status) ? `status-${status}` : "status-draft";
};

const renderEvents = (events) => {
  if (!events.length) {
    eventsTableContainer.innerHTML = `
      <div class="events-message">
        <h3>No events found</h3>
        <p>Try changing your search or status filter.</p>
      </div>
    `;

    return;
  }

  eventsTableContainer.innerHTML = `
    <table class="events-table">
      <thead>
        <tr>
          <th>Event</th>
          <th>Host</th>
          <th>Category</th>
          <th>Event Date</th>
          <th>Status</th>
          <th>Visibility</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${events
          .map((event) => {
            const status = String(event.status || "draft").toLowerCase();
            const isVisible = event.isVisible === true;

            return `
              <tr>
                <td>
                  <span class="event-name">
                    ${escapeHtml(event.eventName || "Untitled event")}
                  </span>
                  <span class="event-subtext">
                    ${escapeHtml(event._id)}
                  </span>
                </td>

                <td>
                  ${escapeHtml(event.host?.name || "Unknown host")}
                  <span class="event-subtext">
                    ${escapeHtml(event.host?.email || "")}
                  </span>
                </td>

                <td>
                  ${escapeHtml(event.category?.name || "Uncategorized")}
                </td>

                <td>${formatDate(event.eventDate)}</td>

                <td>
                  <span class="event-status-badge ${getStatusClass(status)}">
                    ${escapeHtml(status)}
                  </span>
                </td>

                <td>
                  <span class="event-visibility-badge ${
                    isVisible ? "visibility-visible" : "visibility-hidden"
                  }">
                    ${isVisible ? "Visible" : "Hidden"}
                  </span>
                </td>

                <td>
                  <div class="event-actions">
                    <button
                      type="button"
                      class="event-action-button view-event"
                      data-action="view"
                      data-event-id="${escapeHtml(event._id)}"
                    >
                      View
                    </button>

                    ${
                      isVisible
                        ? `
                          <button
                            type="button"
                            class="event-action-button hide-event"
                            data-action="hide"
                            data-event-id="${escapeHtml(event._id)}"
                          >
                            Hide
                          </button>
                        `
                        : `
                          <button
                            type="button"
                            class="event-action-button unhide-event"
                            data-action="unhide"
                            data-event-id="${escapeHtml(event._id)}"
                          >
                            Unhide
                          </button>
                        `
                    }
                  </div>
                </td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    </table>
  `;
};

const renderPagination = (pagination) => {
  const page = pagination.page || 1;
  totalPages = pagination.totalPages || 1;

  if (totalPages <= 1) {
    eventsPagination.innerHTML = "";
    return;
  }

  const buttons = [];

  buttons.push(`
    <span>
      Page ${page} of ${totalPages}
    </span>
  `);

  buttons.push(`
    <button
      type="button"
      data-page="${page - 1}"
      ${page <= 1 ? "disabled" : ""}
    >
      Previous
    </button>
  `);

  const startPage = Math.max(1, page - 2);
  const endPage = Math.min(totalPages, page + 2);

  for (let pageNumber = startPage; pageNumber <= endPage; pageNumber++) {
    buttons.push(`
      <button
        type="button"
        data-page="${pageNumber}"
        class="${pageNumber === page ? "active" : ""}"
        ${pageNumber === page ? "aria-current='page'" : ""}
      >
        ${pageNumber}
      </button>
    `);
  }

  buttons.push(`
    <button
      type="button"
      data-page="${page + 1}"
      ${page >= totalPages ? "disabled" : ""}
    >
      Next
    </button>
  `);

  eventsPagination.innerHTML = buttons.join("");
};

const loadEvents = async () => {
  if (isLoading) return;

  isLoading = true;
  refreshEventsButton.disabled = true;

  eventsTableContainer.innerHTML = `
    <div class="events-message">Loading events...</div>
  `;

  try {
    const token = getAdminToken();

    if (!token) {
      window.location.replace("/admin/login");
      return;
    }

    const params = new URLSearchParams({
      status: eventStatus.value,
      search: eventSearch.value.trim(),
      page: String(currentPage),
      limit: "10",
    });

    const response = await fetch(`/api/admin/events/all?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      await showNotification(
        result.message || "Your admin session has expired.",
        "error",
      );

      window.location.replace("/admin/login");
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load events.");
    }

    updateSummaryCards(result.counts);

    const events = Array.isArray(result.events) ? result.events : [];
    const pagination = result.pagination || {};

    eventsResultCount.textContent = `${pagination.totalEvents ?? events.length} event(s) found`;

    renderEvents(events);
    renderPagination(pagination);
  } catch (error) {
    console.error("Admin Events Error:", error);

    eventsTableContainer.innerHTML = `
      <div class="events-message">
        <h3>Unable to load events</h3>
        <p>${escapeHtml(error.message)}</p>
        <button type="button" class="primary-button" id="retryEvents">
          Try Again
        </button>
      </div>
    `;

    eventsPagination.innerHTML = "";

    document
      .getElementById("retryEvents")
      ?.addEventListener("click", loadEvents);
  } finally {
    isLoading = false;
    refreshEventsButton.disabled = false;
  }
};

eventFilters.addEventListener("submit", (event) => {
  event.preventDefault();
  currentPage = 1;
  loadEvents();
});

refreshEventsButton.addEventListener("click", loadEvents);

clearFiltersButton.addEventListener("click", () => {
  eventSearch.value = "";
  eventStatus.value = "all";
  currentPage = 1;
  loadEvents();
});

eventsPagination.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-page]");

  if (!button || button.disabled) return;

  const nextPage = Number(button.dataset.page);

  if (
    !Number.isInteger(nextPage) ||
    nextPage < 1 ||
    nextPage > totalPages ||
    nextPage === currentPage
  ) {
    return;
  }

  currentPage = nextPage;
  loadEvents();
});

eventsTableContainer.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button || button.disabled) return;

  const { action, eventId } = button.dataset;

  if (action === "view") {
    window.location.href = `/admin/event-applications/${encodeURIComponent(eventId)}`;
    return;
  }

  if (!["hide", "unhide"].includes(action)) return;

  const isHiding = action === "hide";

  let confirmed = false;

  if (window.Swal) {
    const result = await Swal.fire({
      title: isHiding ? "Hide this event?" : "Make this event visible?",
      text: isHiding
        ? "This event will no longer appear in public event listings."
        : "This event will become visible in public event listings.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: isHiding ? "Yes, hide it" : "Yes, make visible",
      cancelButtonText: "Cancel",
      confirmButtonColor: isHiding ? "#dc2626" : "#5945e5",
    });

    confirmed = result.isConfirmed;
  } else {
    await showNotification(
      "SweetAlert2 is required to confirm this action.",
      "error",
    );
    return;
  }

  if (!confirmed) return;

  button.disabled = true;

  try {
    const token = getAdminToken();

    const response = await fetch(
      `/api/admin/events/${encodeURIComponent(eventId)}/${action}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      await showNotification(
        result.message || "Your admin session has expired.",
        "error",
      );

      window.location.replace("/admin/login");
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to update event visibility.");
    }

    await showNotification(
      result.message ||
        (isHiding ? "Event hidden successfully." : "Event is visible now."),
      "success",
    );

    await loadEvents();
  } catch (error) {
    console.error("Update Event Visibility Error:", error);
    await showNotification(error.message, "error");
  } finally {
    button.disabled = false;
  }
});

loadEvents();
