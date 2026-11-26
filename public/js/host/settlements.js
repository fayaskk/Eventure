const settlementToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken")
  );
};

const settlementFetch = async (url, options = {}) => {
  const token = settlementToken();

  if (!token) {
    window.location.replace("/login");
    throw new Error("Authentication required");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");

    window.location.replace("/login");
    throw new Error("Session expired");
  }

  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Something went wrong");
  }

  return result;
};

const formatSettlementCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format((Number(amount) || 0) / 100);
};

const formatSettlementDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const showSettlementToast = (message) => {
  const toast = document.getElementById("settlementToast");

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
};

const loadSettlementSummary = async () => {
  const result = await settlementFetch("/api/host/settlements/summary");

  const summary = result.summary;

  document.getElementById("totalEarnings").textContent =
    formatSettlementCurrency(summary.totalEarnings);

  document.getElementById("availableBalance").textContent =
    formatSettlementCurrency(summary.availableBalance);

  document.getElementById("pendingSettlement").textContent =
    formatSettlementCurrency(summary.pendingSettlement);

  document.getElementById("totalPaid").textContent =
    formatSettlementCurrency(summary.totalPaid);

  document.getElementById("upcomingEarnings").textContent =
    formatSettlementCurrency(summary.upcomingEarnings);

  document.getElementById("onHold").textContent =
    formatSettlementCurrency(summary.onHold);
};

const loadSettlementEvents = async () => {
  const container = document.getElementById("settlementEvents");

  const result = await settlementFetch("/api/host/settlements/events");

  const events = result.events || [];

  if (!events.length) {
    container.innerHTML = `
      <div class="empty-settlements">
        <i class="bi bi-calendar-event"></i>
        <h5>No events found</h5>
        <p>Your event earnings will appear here.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = events
    .map((event) => {
      const completed = event.eventStatus === "completed";

      return `
        <article class="settlement-event-card">

          <div class="event-card-top">
            <div>
              <h3>${escapeSettlementHTML(event.eventName)}</h3>
              <p>${formatSettlementDate(event.eventDate)}</p>
            </div>

            <span class="event-status ${completed ? "completed" : "upcoming"}">
              ${escapeSettlementHTML(event.eventStatus)}
            </span>
          </div>

          <div class="event-earning-details">

            <div>
              <span>Total Earnings</span>
              <strong>${formatSettlementCurrency(event.totalEarnings)}</strong>
            </div>

            <div>
              <span>Available Balance</span>
              <strong>${formatSettlementCurrency(event.availableBalance)}</strong>
            </div>

            <div>
              <span>Pending Settlement</span>
              <strong>${formatSettlementCurrency(event.pendingSettlement)}</strong>
            </div>

            <div>
              <span>Total Paid</span>
              <strong>${formatSettlementCurrency(event.totalPaid)}</strong>
            </div>

          </div>

          <div class="event-card-footer">

            <span>
              On hold: ${formatSettlementCurrency(event.onHold)}
            </span>

            <button
              class="request-settlement-btn"
              data-event-id="${event.eventId}"
              ${event.canRequestSettlement ? "" : "disabled"}
            >
              ${
                event.canRequestSettlement
                  ? "Request Settlement"
                  : completed
                    ? "No Available Balance"
                    : "Event Not Completed"
              }
            </button>

          </div>

        </article>
      `;
    })
    .join("");
};

const loadSettlementHistory = async () => {
  const tbody = document.getElementById("settlementHistory");

  const result = await settlementFetch("/api/host/settlements/history");

  const settlements = result.settlements || [];

  if (!settlements.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="table-loading">
          No settlement history available.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = settlements
    .map((settlement) => {
      return `
        <tr>
          <td>${escapeSettlementHTML(settlement.event?.eventName || "Event")}</td>

          <td>${formatSettlementDate(settlement.created_at)}</td>

          <td>
            <strong>${formatSettlementCurrency(settlement.totalAmount)}</strong>
          </td>

          <td>
            <span class="settlement-badge ${settlement.status}">
              ${escapeSettlementHTML(settlement.status)}
            </span>
          </td>

          <td>
            ${escapeSettlementHTML(settlement.paymentReference || "—")}
          </td>
        </tr>
      `;
    })
    .join("");
};

const escapeSettlementHTML = (value) => {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
};

const requestEventSettlement = async (eventId) => {
  const confirmed = window.confirm(
    "Are you sure you want to request settlement for this event?",
  );

  if (!confirmed) return;

  try {
    await settlementFetch(`/api/host/settlements/${eventId}`, {
      method: "POST",
    });

    showSettlementToast("Settlement request submitted successfully!");

    await loadSettlementDashboard();
  } catch (error) {
    showSettlementToast(error.message);
  }
};

const loadSettlementDashboard = async () => {
  const container = document.getElementById("settlementEvents");

  container.innerHTML = `
    <div class="settlement-loading">
      <div class="spinner-border"></div>
      <p>Loading your settlement information...</p>
    </div>
  `;

  try {
    await Promise.all([
      loadSettlementSummary(),
      loadSettlementEvents(),
      loadSettlementHistory(),
    ]);
  } catch (error) {
    console.error("Settlement dashboard error:", error);

    container.innerHTML = `
      <div class="empty-settlements">
        <i class="bi bi-exclamation-circle"></i>
        <h5>Unable to load settlements</h5>
        <p>${escapeSettlementHTML(error.message)}</p>
      </div>
    `;
  }
};

document.addEventListener("click", (event) => {
  const button = event.target.closest(".request-settlement-btn");

  if (!button || button.disabled) return;

  requestEventSettlement(button.dataset.eventId);
});

document.addEventListener("DOMContentLoaded", () => {
  loadSettlementDashboard();

  document
    .getElementById("refreshSettlements")
    .addEventListener("click", loadSettlementDashboard);
});