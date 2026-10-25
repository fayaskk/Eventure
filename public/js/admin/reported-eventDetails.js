const eventSummary = document.getElementById("event-summary");
const reportsContainer = document.getElementById("event-reports-container");
const reportsCount = document.getElementById("reports-count");

const eventId = window.location.pathname.split("/").filter(Boolean).at(-1);

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

const showMessage = (message, icon = "info") => {
  if (typeof window.showMessage === "function") {
    return window.showMessage(message, icon);
  }

  if (typeof Swal !== "undefined") {
    return Swal.fire({
      title: message,
      icon,
      confirmButtonColor: "#5846df",
    });
  }

  return Promise.resolve();
};

const authorizedFetch = async (url, options = {}) => {
  const token = getAdminToken();

  if (!token) {
    window.location.replace("/admin/login");
    throw new Error("Authentication required.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const result = await response.json();

  if (response.status === 401 || response.status === 403) {
    await showMessage(
      result.message || "Your admin session has expired.",
      "error",
    );

    window.location.replace("/admin/login");
    throw new Error("Admin authentication failed.");
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || "The request failed.");
  }

  return result;
};

const loadEventReports = async () => {
  eventSummary.innerHTML =
    '<div class="report-message">Loading event details...</div>';

  reportsContainer.innerHTML =
    '<div class="report-message">Loading reports...</div>';

  try {
    if (!eventId) {
      throw new Error("Event ID is missing.");
    }

    const result = await authorizedFetch(
      `/api/admin/event-reports/${encodeURIComponent(eventId)}`,
    );

    const reports = Array.isArray(result.reports) ? result.reports : [];

    renderEventSummary(reports);
    renderReports(reports);
  } catch (error) {
    console.error("Event Reports Error:", error);

    eventSummary.innerHTML = `
      <div class="report-message report-error">
        <h3>Unable to load event reports</h3>
        <p>${escapeHtml(error.message)}</p>
        <button type="button" id="retryEventReports">Try Again</button>
      </div>
    `;

    reportsContainer.innerHTML = "";

    document
      .getElementById("retryEventReports")
      ?.addEventListener("click", loadEventReports);
  }
};

const renderEventSummary = (reports) => {
  const firstReport = reports[0];
  const event = firstReport?.event;

  eventSummary.innerHTML = `
    <div class="event-summary-card">
      <div>
        <p class="summary-label">EVENT UNDER REVIEW</p>
        <h2>${escapeHtml(event?.eventName || "Reported Event")}</h2>
        <p>Event ID: ${escapeHtml(eventId)}</p>
      </div>
      <div class="summary-stats">
        <div>
          <span>Total Reports</span>
          <strong>${reports.length}</strong>
        </div>
        <div>
          <span>Pending Reports</span>
          <strong>${reports.filter((report) => report.status === "pending").length}</strong>
        </div>
      </div>
    </div>
  `;
};

const renderReports = (reports) => {
  reportsCount.textContent = `${reports.length} report${reports.length === 1 ? "" : "s"}`;

  if (reports.length === 0) {
    reportsContainer.innerHTML = `
      <div class="report-message">
        <h3>No reports found</h3>
        <p>This event has no reports to display.</p>
      </div>
    `;
    return;
  }

  reportsContainer.innerHTML = `
    <div class="reports-list">
      ${reports
        .map((report) => {
          const reporter = report.reportedBy || {};
          const pending = report.status === "pending";

          return `
            <article class="report-card">
              <div class="report-card-header">
                <div>
                  <span class="report-status ${escapeHtml(report.status)}">
                    ${escapeHtml(report.status)}
                  </span>
                  <h3>${escapeHtml(report.reason.replaceAll("_", " "))}</h3>
                </div>
                <span class="report-date">${formatDate(report.created_at)}</span>
              </div>

              <div class="reporter-details">
                <p><strong>Reported by:</strong> ${escapeHtml(reporter.name || "Unavailable")}</p>
                <p><strong>Email:</strong> ${escapeHtml(reporter.email || "Unavailable")}</p>
              </div>

              <div class="report-description">
                <strong>Additional details</strong>
                <p>${escapeHtml(report.description || "No additional details provided.")}</p>
              </div>

              ${
                pending
                  ? `
                    <div class="report-actions">
                      <button
                        type="button"
                        class="dismiss-report-button"
                        data-action="dismiss"
                        data-report-id="${escapeHtml(report._id)}"
                      >
                        Dismiss Report
                      </button>
                      <button
                        type="button"
                        class="resolve-report-button"
                        data-action="resolve"
                        data-report-id="${escapeHtml(report._id)}"
                      >
                        Resolve & Hide Event
                      </button>
                    </div>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("")}
    </div>
  `;
};

const handleReportAction = async (action, reportId, button) => {
  const isResolve = action === "resolve";

  const confirmation = await Swal.fire({
    title: isResolve ? "Resolve this report?" : "Dismiss this report?",
    text: isResolve
      ? "The event will be hidden from public listings, and its pending reports will be resolved."
      : "This report will be dismissed. The event will remain unchanged.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: isResolve ? "Resolve & Hide" : "Dismiss Report",
    cancelButtonText: "Cancel",
    confirmButtonColor: isResolve ? "#dc2626" : "#5846df",
  });

  if (!confirmation.isConfirmed) return;

  button.disabled = true;

  try {
    const result = await authorizedFetch(
      `/api/admin/event-reports/${encodeURIComponent(reportId)}/${action}`,
      {
        method: "PATCH",
      },
    );

    await showMessage(
      result.message ||
        (isResolve
          ? "Report resolved and event hidden."
          : "Report dismissed successfully."),
      "success",
    );

    await loadEventReports();
  } catch (error) {
    console.error("Report Action Error:", error);
    await showMessage(
      error.message || "Unable to process the report.",
      "error",
    );
    button.disabled = false;
  }
};

reportsContainer.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action][data-report-id]");

  if (!button || button.disabled) return;

  handleReportAction(button.dataset.action, button.dataset.reportId, button);
});

document.addEventListener("DOMContentLoaded", loadEventReports);
