const reportedEventsContainer = document.getElementById(
  "reportedEventsContainer",
);
const totalReportedEvents = document.getElementById("totalReportedEvents");
const totalPendingReports = document.getElementById("totalPendingReports");
const refreshReportsButton = document.getElementById("refreshReports");

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

const loadReportedEvents = async () => {
  reportedEventsContainer.innerHTML =
    '<div class="report-message">Loading reported events...</div>';

  try {
    const token = getAdminToken();

    if (!token) {
      window.location.replace("/admin/login");
      return;
    }

    const response = await fetch("/api/admin/event-reports", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      if (typeof window.showMessage === "function") {
        await window.showMessage(
          result.message || "Your admin session has expired.",
          "error",
        );
      }

      window.location.replace("/admin/login");
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load reported events.");
    }

    const reportedEvents = Array.isArray(result.reportedEvents)
      ? result.reportedEvents
      : [];

    totalReportedEvents.textContent = reportedEvents.length;

    totalPendingReports.textContent = reportedEvents.reduce(
      (total, event) => total + (Number(event.pendingReports) || 0),
      0,
    );

    renderReportedEvents(reportedEvents);
  } catch (error) {
    console.error("Reported Events Error:", error);

    reportedEventsContainer.innerHTML = `
      <div class="report-message report-error">
        <h3>Unable to load reported events</h3>
        <p>${escapeHtml(error.message)}</p>
        <button type="button" id="retryReportedEvents">Try Again</button>
      </div>
    `;

    document
      .getElementById("retryReportedEvents")
      ?.addEventListener("click", loadReportedEvents);
  }
};

const renderReportedEvents = (events) => {
  if (events.length === 0) {
    reportedEventsContainer.innerHTML = `
      <div class="report-message">
        <h3>No reported events</h3>
        <p>There are currently no events reported by users.</p>
      </div>
    `;
    return;
  }

  reportedEventsContainer.innerHTML = `
    <div class="reported-events-list">
      ${events
        .map(
          (event) => `
            <article class="reported-event-card">
              <div class="reported-event-info">
                <h3>${escapeHtml(event.eventName || "Unavailable event")}</h3>
                <p>Event date: ${formatDate(event.eventDate)}</p>
                <p>Total reports: ${Number(event.totalReports) || 0}</p>
                <p>Pending reports: ${Number(event.pendingReports) || 0}</p>
                <div class="reported-event-status">
                  <span class="status-badge ${event.isVisible ? "visible" : "hidden"}">
                    ${event.isVisible ? "Visible" : "Hidden"}
                  </span>
                  <span class="status-badge">
                    ${escapeHtml(event.status || "Unknown")}
                  </span>
                </div>
              </div>

              <a
                class="view-reports-button"
                href="/admin/reported-events/${encodeURIComponent(event._id)}"
              >
                View Reports
              </a>
            </article>
          `,
        )
        .join("")}
    </div>
  `;
};

refreshReportsButton.addEventListener("click", loadReportedEvents);

document.addEventListener("DOMContentLoaded", loadReportedEvents);
