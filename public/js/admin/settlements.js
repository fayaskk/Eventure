const API_BASE = "/api/admin/settlements";

const tableBody = document.getElementById("settlementsTableBody");
const loadingElement = document.getElementById("settlementLoading");
const errorElement = document.getElementById("settlementError");
const tableWrapper = document.getElementById("settlementTableWrapper");
const emptyElement = document.getElementById("emptySettlements");

const searchInput = document.getElementById("settlementSearch");
const statusFilter = document.getElementById("statusFilter");

const settlementModal = document.getElementById("settlementModal");
const settlementDetailsContent = document.getElementById("settlementDetailsContent");

const actionModal = document.getElementById("actionModal");
const actionModalTitle = document.getElementById("actionModalTitle");
const actionFormFields = document.getElementById("actionFormFields");
const actionForm = document.getElementById("settlementActionForm");
const confirmActionButton = document.getElementById("confirmActionButton");

const toast = document.getElementById("settlementToast");

let settlements = [];
let currentAction = null;
let currentSettlementId = null;

const getToken = () => {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("accessToken") ||
        sessionStorage.getItem("token") ||
        sessionStorage.getItem("accessToken")
    );
};

const getHeaders = () => {
    const headers = {
        "Content-Type": "application/json"
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    return headers;
};

const escapeHTML = (value) => {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[character]);
};

const formatCurrency = (amount) => {
    const rupees = Number(amount || 0) / 100;

    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(rupees);
};

const formatDate = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Not available";
    }

    return parsedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });
};

const formatDateTime = (date) => {
    if (!date) return "Not available";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
        return "Not available";
    }

    return parsedDate.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
};

const showToast = (message, type = "success") => {
    toast.textContent = message;
    toast.className = `settlement-toast show ${type}`;

    setTimeout(() => {
        toast.classList.remove("show");
    }, 3000);
};

const getStatusClass = (status) => {
    const allowedStatuses = ["pending", "approved", "paid", "rejected"];

    return allowedStatuses.includes(status)
        ? `status-${status}`
        : "";
};

const getStatusBadge = (status) => {
    const safeStatus = escapeHTML(status || "unknown");

    return `
        <span class="status-badge ${getStatusClass(status)}">
            ${safeStatus}
        </span>
    `;
};

const setLoading = (loading) => {
    loadingElement.hidden = !loading;
    tableWrapper.hidden = loading;
    errorElement.hidden = true;
};

const updateStatistics = () => {
    const total = settlements.length;

    const pending = settlements.filter(
        item => item.status === "pending"
    ).length;

    const approved = settlements.filter(
        item => item.status === "approved"
    ).length;

    const paid = settlements
        .filter(item => item.status === "paid")
        .reduce((sum, item) => sum + Number(item.totalAmount || 0), 0);

    document.getElementById("totalSettlements").textContent = total;

    document.getElementById("pendingSettlements").textContent = pending;

    document.getElementById("approvedSettlements").textContent = approved;

    document.getElementById("totalPaid").textContent = formatCurrency(paid);
};

const fetchSettlements = async () => {
    setLoading(true);

    try {
        const response = await fetch(API_BASE, {
            method: "GET",
            headers: getHeaders()
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to fetch settlements");
        }

        settlements = Array.isArray(result.settlements)
            ? result.settlements
            : [];

        updateStatistics();
        renderSettlements();

        tableWrapper.hidden = false;

    } catch (error) {
        console.error("Fetch settlements error:", error);

        errorElement.textContent = error.message;
        errorElement.hidden = false;
        tableWrapper.hidden = true;

    } finally {
        loadingElement.hidden = true;
    }
};

const renderSettlements = () => {
    const searchTerm = searchInput.value.trim().toLowerCase();
    const selectedStatus = statusFilter.value;

    const filteredSettlements = settlements.filter(settlement => {
        const hostName = settlement.host?.name || "";
        const hostEmail = settlement.host?.email || "";
        const eventName = settlement.event?.eventName || "";

        const matchesSearch = [
            hostName,
            hostEmail,
            eventName
        ].some(value => value.toLowerCase().includes(searchTerm));

        const matchesStatus =
            selectedStatus === "all" ||
            settlement.status === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    tableBody.innerHTML = "";

    emptyElement.hidden = filteredSettlements.length > 0;

    filteredSettlements.forEach(settlement => {
        const hostName = settlement.host?.name || "Unknown host";
        const hostEmail = settlement.host?.email || "No email";
        const eventName = settlement.event?.eventName || "Unknown event";

        const row = document.createElement("tr");

        let actionButtons = `
            <button
                class="view-button"
                data-action="view"
                data-id="${escapeHTML(settlement._id)}"
            >
                View details
            </button>
        `;

        if (settlement.status === "pending") {
            actionButtons = `
                <div class="row-actions">
                    <button
                        class="approve-button"
                        data-action="approve"
                        data-id="${escapeHTML(settlement._id)}"
                    >
                        Approve
                    </button>

                    <button
                        class="reject-button"
                        data-action="reject"
                        data-id="${escapeHTML(settlement._id)}"
                    >
                        Reject
                    </button>
                </div>
            `;
        }

        if (settlement.status === "approved") {
            actionButtons = `
                <div class="row-actions">
                    <button
                        class="paid-button"
                        data-action="paid"
                        data-id="${escapeHTML(settlement._id)}"
                    >
                        Mark paid
                    </button>
                </div>
            `;
        }

        row.innerHTML = `
            <td>
                <div class="host-cell">
                    <strong>${escapeHTML(hostName)}</strong>
                    <span>${escapeHTML(hostEmail)}</span>
                </div>
            </td>

            <td>
                <div class="event-cell">
                    <strong>${escapeHTML(eventName)}</strong>
                    <span>${formatDate(settlement.event?.eventDate)}</span>
                </div>
            </td>

            <td>
                <span class="amount-cell">
                    ${formatCurrency(settlement.totalAmount)}
                </span>
            </td>

            <td>${formatDate(settlement.created_at || settlement.createdAt)}</td>

            <td>${getStatusBadge(settlement.status)}</td>

            <td>
                ${actionButtons}
            </td>
        `;

        tableBody.appendChild(row);
    });
};

const fetchSettlementDetails = async (id) => {
    try {
        const response = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
            headers: getHeaders()
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to fetch settlement details");
        }

        renderSettlementDetails(result.settlement);

        settlementModal.classList.add("show");

    } catch (error) {
        console.error("Settlement details error:", error);
        showToast(error.message, "error");
    }
};

const renderSettlementDetails = (settlement) => {
    const host = settlement.host || {};
    const event = settlement.event || {};
    const processedBy = settlement.processedBy || {};

    const payments = Array.isArray(settlement.payments)
        ? settlement.payments
        : [];

    const paymentHTML = payments.map(item => {
        const payment = item.payment || {};

        return `
            <div class="payment-allocation">
                <div>
                    <strong>Payment allocation</strong>
                    <div>Payment ID: ${escapeHTML(payment._id || "Unavailable")}</div>
                </div>

                <strong>${formatCurrency(item.amount)}</strong>
            </div>
        `;
    }).join("");

    settlementDetailsContent.innerHTML = `
        <div class="detail-section">
            <h3>Settlement Summary</h3>

            <div class="detail-grid">

                <div class="detail-item">
                    <span>Settlement ID</span>
                    <strong>${escapeHTML(settlement._id)}</strong>
                </div>

                <div class="detail-item">
                    <span>Status</span>
                    ${getStatusBadge(settlement.status)}
                </div>

                <div class="detail-item">
                    <span>Total Amount</span>
                    <strong>${formatCurrency(settlement.totalAmount)}</strong>
                </div>

                <div class="detail-item">
                    <span>Requested Date</span>
                    <strong>${formatDateTime(settlement.created_at || settlement.createdAt)}</strong>
                </div>

                <div class="detail-item">
                    <span>Processed Date</span>
                    <strong>${formatDateTime(settlement.processedAt)}</strong>
                </div>

                <div class="detail-item">
                    <span>Processed By</span>
                    <strong>${escapeHTML(processedBy.name || "Not processed")}</strong>
                </div>

            </div>
        </div>

        <div class="detail-section">
            <h3>Host Information</h3>

            <div class="detail-grid">
                <div class="detail-item">
                    <span>Host Name</span>
                    <strong>${escapeHTML(host.name || "Unknown")}</strong>
                </div>

                <div class="detail-item">
                    <span>Email</span>
                    <strong>${escapeHTML(host.email || "Unavailable")}</strong>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Event Information</h3>

            <div class="detail-grid">
                <div class="detail-item">
                    <span>Event Name</span>
                    <strong>${escapeHTML(event.eventName || "Unknown")}</strong>
                </div>

                <div class="detail-item">
                    <span>Event Date</span>
                    <strong>${formatDate(event.eventDate)}</strong>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Payment Allocations (${payments.length})</h3>

            ${paymentHTML || "<p>No payment allocations found.</p>"}

            <div class="detail-total">
                <span>Total Settlement</span>
                <span>${formatCurrency(settlement.totalAmount)}</span>
            </div>
        </div>

        ${settlement.paymentReference ? `
            <div class="detail-section">
                <h3>Payment Information</h3>

                <div class="detail-item">
                    <span>Bank / UPI Reference</span>
                    <strong>${escapeHTML(settlement.paymentReference)}</strong>
                </div>
            </div>
        ` : ""}

        ${settlement.adminNote ? `
            <div class="detail-section">
                <h3>Admin Note</h3>
                <p>${escapeHTML(settlement.adminNote)}</p>
            </div>
        ` : ""}
    `;
};

const openActionModal = (action, id) => {
    currentAction = action;
    currentSettlementId = id;

    actionForm.reset();

    if (action === "approve") {
        actionModalTitle.textContent = "Approve Settlement";

        actionFormFields.innerHTML = `
            <p>Are you sure you want to approve this settlement request?</p>
            <p>The settlement will move to the approved stage.</p>
        `;

        confirmActionButton.textContent = "Approve settlement";
    }

    if (action === "reject") {
        actionModalTitle.textContent = "Reject Settlement";

        actionFormFields.innerHTML = `
            <div class="form-field">
                <label for="adminNote">Reason for rejection *</label>

                <textarea
                    id="adminNote"
                    name="adminNote"
                    placeholder="Enter the reason for rejecting this settlement..."
                    required
                    minlength="3"
                ></textarea>
            </div>
        `;

        confirmActionButton.textContent = "Reject settlement";
    }

    if (action === "paid") {
        actionModalTitle.textContent = "Mark Settlement as Paid";

        actionFormFields.innerHTML = `
            <div class="form-field">
                <label for="paymentReference">Bank / UPI Transaction Reference *</label>

                <input
                    type="text"
                    id="paymentReference"
                    name="paymentReference"
                    placeholder="Enter transaction reference"
                    required
                >
            </div>

            <div class="form-field">
                <label for="adminNote">Admin Note (Optional)</label>

                <textarea
                    id="adminNote"
                    name="adminNote"
                    placeholder="Add an optional note..."
                ></textarea>
            </div>
        `;

        confirmActionButton.textContent = "Confirm payment";
    }

    actionModal.classList.add("show");
};

const submitSettlementAction = async (event) => {
    event.preventDefault();

    if (!currentAction || !currentSettlementId) {
        return;
    }

    let endpoint = "";
    let body = {};

    if (currentAction === "approve") {
        endpoint = `${API_BASE}/${currentSettlementId}/approve`;
    }

    if (currentAction === "reject") {
        endpoint = `${API_BASE}/${currentSettlementId}/reject`;

        body = {
            adminNote: document.getElementById("adminNote").value.trim()
        };
    }

    if (currentAction === "paid") {
        endpoint = `${API_BASE}/${currentSettlementId}/paid`;

        body = {
            paymentReference: document.getElementById("paymentReference").value.trim(),
            adminNote: document.getElementById("adminNote").value.trim()
        };
    }

    if (
        currentAction === "reject" &&
        !body.adminNote
    ) {
        showToast("Please provide a rejection reason.", "error");
        return;
    }

    if (
        currentAction === "paid" &&
        !body.paymentReference
    ) {
        showToast("Please enter the transaction reference.", "error");
        return;
    }

    confirmActionButton.disabled = true;
    confirmActionButton.textContent = "Processing...";

    try {
        const response = await fetch(endpoint, {
            method: "PATCH",
            headers: getHeaders(),
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Settlement action failed");
        }

        actionModal.classList.remove("show");

        showToast(result.message || "Settlement updated successfully.");

        await fetchSettlements();

    } catch (error) {
        console.error("Settlement action error:", error);
        showToast(error.message, "error");

    } finally {
        confirmActionButton.disabled = false;
        confirmActionButton.textContent = "Confirm";
    }
};

tableBody.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const { action, id } = button.dataset;

    if (action === "view") {
        fetchSettlementDetails(id);
    }

    if (["approve", "reject", "paid"].includes(action)) {
        openActionModal(action, id);
    }
});

searchInput.addEventListener("input", renderSettlements);

statusFilter.addEventListener("change", renderSettlements);

document.getElementById("refreshSettlements").addEventListener(
    "click",
    fetchSettlements
);

actionForm.addEventListener("submit", submitSettlementAction);

document.querySelectorAll("[data-close-modal]").forEach(element => {
    element.addEventListener("click", () => {
        settlementModal.classList.remove("show");
    });
});

document.querySelectorAll("[data-close-action]").forEach(element => {
    element.addEventListener("click", () => {
        actionModal.classList.remove("show");
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        settlementModal.classList.remove("show");
        actionModal.classList.remove("show");
    }
});

fetchSettlements();