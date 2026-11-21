const bookingState = {
    currentPage: 1,
    totalPages: 1,
    limit: 10,
    search: "",
    filter: "all",
    eventId: "",
    searchTimer: null,
};

const getBookingToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken");

const escapeBookingHtml = (value) =>
    String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

const formatBookingCurrency = (amount, currency = "INR") =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
    }).format(Number(amount) || 0);

const formatBookingDate = (date) => {
    if (!date) return "Date unavailable";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "Date unavailable";

    return parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
};

const getBookingTokenHeaders = () => {
    const token = getBookingToken();

    if (!token) {
        window.location.replace("/login");
        throw new Error("Authentication required.");
    }

    return {
        Authorization: `Bearer ${token}`,
    };
};

const bookingApi = async (url) => {
    const response = await fetch(url, {
        headers: getBookingTokenHeaders(),
        cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("accessToken");

        window.location.replace("/login");

        throw new Error("Your session has expired.");
    }

    if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load booking data.");
    }

    return result.data;
};

const showBookingError = (message) => {
    if (typeof Swal !== "undefined") {
        Swal.fire({
            title: "Unable to load data",
            text: message,
            icon: "error",
            confirmButtonColor: "#6355e7",
        });
    } else {
        window.alert(message);
    }
};

const setBookingTableState = (message, loading = false) => {
    const body = document.getElementById("booking-table-body");

    body.innerHTML = `
        <tr>
            <td colspan="7">
                <div class="booking-state">
                    ${
                        loading
                            ? '<div class="booking-spinner"></div>'
                            : ""
                    }
                    <p>${escapeBookingHtml(message)}</p>
                </div>
            </td>
        </tr>
    `;
};

const loadBookingSummary = async () => {
    const data = await bookingApi("/api/host/bookings/summary");

    document.getElementById("total-bookings").textContent =
        data.totalBookings ?? 0;

    document.getElementById("upcoming-bookings").textContent =
        data.upcomingBookings ?? 0;

    document.getElementById("ongoing-bookings").textContent =
        data.ongoingBookings ?? 0;

    document.getElementById("completed-bookings").textContent =
        data.completedBookings ?? 0;

    document.getElementById("total-revenue").textContent =
        formatBookingCurrency(data.totalRevenue);

    document.getElementById("total-tickets").textContent =
        data.totalTickets ?? 0;

    document.getElementById("checked-in-tickets").textContent =
        data.checkedInTickets ?? 0;

    document.getElementById("not-checked-in-tickets").textContent =
        data.notCheckedInTickets ?? 0;

    const checkedIn = Number(data.checkedInTickets || 0);
    const notCheckedIn = Number(data.notCheckedInTickets || 0);
    const total = checkedIn + notCheckedIn;

    const percentage = total > 0
        ? Math.round((checkedIn / total) * 100)
        : 0;

    document.getElementById("attendance-percentage").textContent =
        `${percentage}%`;

    document.getElementById("attendance-progress-fill").style.width =
        `${percentage}%`;
};

const loadBookingEvents = async () => {
    const data = await bookingApi("/api/host/feedback/events");

    const select = document.getElementById("booking-event-filter");

    const events = Array.isArray(data) ? data : [];

    select.innerHTML = `
        <option value="">All Events</option>
        ${events.map(event => `
            <option value="${escapeBookingHtml(event._id)}">
                ${escapeBookingHtml(event.eventName)}
            </option>
        `).join("")}
    `;
};

const getBookingStatus = (booking) => {
    if (booking.bookingStatus === "cancelled") return "cancelled";
    if (booking.paymentStatus === "refunded") return "refunded";

    const status = booking.event?.timingStatus || "unknown";

    return ["upcoming", "ongoing", "completed"].includes(status)
        ? status
        : "unknown";
};

const renderBookingRows = (bookings) => {
    const body = document.getElementById("booking-table-body");

    if (!Array.isArray(bookings) || bookings.length === 0) {
        setBookingTableState("No bookings found for the selected filters.");
        return;
    }

    body.innerHTML = bookings.map(booking => {
        const attendee = booking.attendee || {};
        const event = booking.event || {};
        const status = getBookingStatus(booking);

        return `
            <tr>
                <td>
                    <span class="booking-reference">
                        ${escapeBookingHtml(booking.bookingReference)}
                    </span>
                    <span class="booking-subtext">
                        ${formatBookingDate(booking.bookingDate)}
                    </span>
                </td>

                <td>
                    <span class="booking-attendee-name">
                        ${escapeBookingHtml(attendee.name || "Unknown")}
                    </span>
                    <span class="booking-attendee-email">
                        ${escapeBookingHtml(attendee.email || "No email")}
                    </span>
                </td>

                <td>
                    <span class="booking-event-name">
                        ${escapeBookingHtml(event.eventName || "Unknown event")}
                    </span>
                    <span class="booking-subtext">
                        ${formatBookingDate(event.eventDate)}
                    </span>
                </td>

                <td>
                    <strong>${Number(booking.totalTickets || 0)}</strong>
                </td>

                <td>
                    <span class="booking-amount">
                        ${formatBookingCurrency(booking.amountPaid, booking.currency)}
                    </span>
                </td>

                <td>
                    <span class="booking-status ${status}">
                        ${escapeBookingHtml(status)}
                    </span>
                </td>

                <td>
                    <button
                        type="button"
                        class="booking-view-btn"
                        data-booking-id="${escapeBookingHtml(booking._id)}"
                    >
                        <i class="bi bi-eye"></i>
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join("");
};

const updateBookingPagination = (pagination = {}) => {
    const element = document.getElementById("booking-pagination");

    bookingState.currentPage = Number(pagination.currentPage || 1);
    bookingState.totalPages = Math.max(
        1,
        Number(pagination.totalPages || 1)
    );

    element.hidden = false;

    document.getElementById("booking-page-info").textContent =
        `Page ${bookingState.currentPage} of ${bookingState.totalPages}`;

    document.getElementById("booking-prev").disabled =
        bookingState.currentPage <= 1;

    document.getElementById("booking-next").disabled =
        bookingState.currentPage >= bookingState.totalPages;
};

const loadBookings = async () => {
    setBookingTableState("Loading bookings...", true);

    try {
        const query = new URLSearchParams({
            page: String(bookingState.currentPage),
            limit: String(bookingState.limit),
            search: bookingState.search,
            filter: bookingState.filter,
            eventId: bookingState.eventId,
        });

        const data = await bookingApi(
            `/api/host/bookings?${query.toString()}`
        );

        renderBookingRows(data.bookings || []);
        updateBookingPagination(data.pagination || {});

    } catch (error) {
        setBookingTableState(error.message);
        document.getElementById("booking-pagination").hidden = true;
    }
};

const renderBookingDetails = (data) => {
    const booking = data.booking || {};
    const attendee = data.attendee || {};
    const event = data.event || {};
    const payment = data.payment || {};
    const tickets = data.ticketDetails || [];

    const content = document.getElementById("booking-modal-content");

    content.innerHTML = `
        <div class="booking-details-content">

            <section class="booking-detail-section">
                <h3>Booking Information</h3>

                <div class="booking-detail-grid">
                    <div class="booking-detail-item">
                        <span>Booking Reference</span>
                        <strong>${escapeBookingHtml(booking.bookingReference)}</strong>
                    </div>

                    <div class="booking-detail-item">
                        <span>Booking Date</span>
                        <strong>${formatBookingDate(booking.bookingDate)}</strong>
                    </div>

                    <div class="booking-detail-item">
                        <span>Booking Status</span>
                        <strong>${escapeBookingHtml(booking.bookingStatus)}</strong>
                    </div>

                    <div class="booking-detail-item">
                        <span>Payment Status</span>
                        <strong>${escapeBookingHtml(payment.status || booking.paymentStatus)}</strong>
                    </div>

                    <div class="booking-detail-item">
                        <span>Total Tickets</span>
                        <strong>${Number(booking.totalTickets || 0)}</strong>
                    </div>

                    <div class="booking-detail-item">
                        <span>Amount Paid</span>
                        <strong>${formatBookingCurrency(payment.amount, payment.currency)}</strong>
                    </div>
                </div>
            </section>

            <section class="booking-detail-section">
                <h3>Attendee Information</h3>

                <div class="booking-detail-grid">
                    <div class="booking-detail-item">
                        <span>Name</span>
                        <strong>${escapeBookingHtml(attendee.name)}</strong>
                    </div>

                    <div class="booking-detail-item">
                        <span>Email</span>
                        <strong>${escapeBookingHtml(attendee.email)}</strong>
                    </div>
                </div>
            </section>

            <section class="booking-detail-section">
                <h3>Event Information</h3>

                <div class="booking-detail-grid">
                    <div class="booking-detail-item">
                        <span>Event</span>
                        <strong>${escapeBookingHtml(event.eventName)}</strong>
                    </div>

                    <div class="booking-detail-item">
                        <span>Event Date</span>
                        <strong>${formatBookingDate(event.eventDate)}</strong>
                    </div>

                    <div class="booking-detail-item">
                        <span>Venue</span>
                        <strong>${escapeBookingHtml(event.location?.venue)}</strong>
                    </div>

                    <div class="booking-detail-item">
                        <span>City</span>
                        <strong>${escapeBookingHtml(event.location?.city)}</strong>
                    </div>
                </div>
            </section>

            <section class="booking-detail-section">
                <h3>Ticket Information</h3>

                ${
                    tickets.length
                        ? tickets.map(ticket => `
                            <div class="booking-ticket-card">
                                <div>
                                    <h4>${escapeBookingHtml(ticket.ticketName)}</h4>
                                    <p>
                                        ${escapeBookingHtml(ticket.owner?.name || "Attendee")}
                                        · ${escapeBookingHtml(ticket.attendanceStatus)}
                                    </p>
                                    <p>
                                        Ticket status: ${escapeBookingHtml(ticket.status)}
                                    </p>
                                </div>

                                <strong>
                                    ${formatBookingCurrency(ticket.price)}
                                </strong>
                            </div>
                        `).join("")
                        : '<div class="booking-state"><p>No ticket records found.</p></div>'
                }
            </section>

        </div>
    `;
};

const openBookingDetails = async (bookingId) => {
    const overlay = document.getElementById("booking-modal-overlay");
    const content = document.getElementById("booking-modal-content");

    overlay.hidden = false;
    document.body.style.overflow = "hidden";

    content.innerHTML = `
        <div class="booking-state">
            <div class="booking-spinner"></div>
            <p>Loading booking details...</p>
        </div>
    `;

    try {
        const data = await bookingApi(
            `/api/host/bookings/${encodeURIComponent(bookingId)}`
        );

        renderBookingDetails(data);

    } catch (error) {
        content.innerHTML = `
            <div class="booking-state">
                <p>${escapeBookingHtml(error.message)}</p>
            </div>
        `;
    }
};

const closeBookingDetails = () => {
    document.getElementById("booking-modal-overlay").hidden = true;
    document.body.style.overflow = "";
};

const initializeHostBookings = async () => {
    try {
        await Promise.all([
            loadBookingSummary(),
            loadBookingEvents(),
        ]);

        await loadBookings();

    } catch (error) {
        console.error("Host booking initialization failed:", error);
        showBookingError(error.message);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const searchInput = document.getElementById("booking-search");
    const statusFilter = document.getElementById("booking-status-filter");
    const eventFilter = document.getElementById("booking-event-filter");

    searchInput.addEventListener("input", () => {
        clearTimeout(bookingState.searchTimer);

        bookingState.searchTimer = setTimeout(() => {
            bookingState.search = searchInput.value.trim();
            bookingState.currentPage = 1;
            loadBookings();
        }, 350);
    });

    statusFilter.addEventListener("change", () => {
        bookingState.filter = statusFilter.value;
        bookingState.currentPage = 1;
        loadBookings();
    });

    eventFilter.addEventListener("change", () => {
        bookingState.eventId = eventFilter.value;
        bookingState.currentPage = 1;
        loadBookings();
    });

    document.getElementById("booking-prev").addEventListener("click", () => {
        if (bookingState.currentPage <= 1) return;

        bookingState.currentPage--;
        loadBookings();
    });

    document.getElementById("booking-next").addEventListener("click", () => {
        if (bookingState.currentPage >= bookingState.totalPages) return;

        bookingState.currentPage++;
        loadBookings();
    });

    document.getElementById("refresh-bookings").addEventListener("click", async () => {
        await initializeHostBookings();
    });

    document.getElementById("booking-table-body").addEventListener("click", (event) => {
        const button = event.target.closest("[data-booking-id]");

        if (!button) return;

        openBookingDetails(button.dataset.bookingId);
    });

    document.getElementById("close-booking-modal").addEventListener("click", closeBookingDetails);

    document.getElementById("booking-modal-overlay").addEventListener("click", (event) => {
        if (event.target.id === "booking-modal-overlay") {
            closeBookingDetails();
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeBookingDetails();
        }
    });

    initializeHostBookings();
});