const bookingContent = document.getElementById("booking-content");

const getAuthToken = () =>
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken") ||
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken");

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const eventId = window.location.pathname.split("/").filter(Boolean).at(-1);

let token = getAuthToken();
let eventData = null;
let selectedTickets = {};
let isProcessingPayment = false;

if (!token) {
  window.location.replace(
    `/login?redirect=${encodeURIComponent(`/booking/${eventId}`)}`,
  );
}

const authenticatedFetch = async (url, options = {}) => {
  token = getAuthToken();

  if (!token) {
    throw new Error("Authentication required. Please log in again.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });

  const result = await response.json().catch(() => ({}));

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");

    window.location.replace(
      `/login?redirect=${encodeURIComponent(`/booking/${eventId}`)}`,
    );

    throw new Error("Authentication required.");
  }

  return { response, result };
};

const getAvailableQuantity = (ticket) => {
  const quantity = Number(ticket.quantity) || 0;
  const reserved = Number(ticket.reserved) || 0;
  const sold = Number(ticket.sold) || 0;

  return Math.max(0, quantity - reserved - sold);
};

const loadEvent = async () => {
  try {
    const response = await fetch(`/api/events/${encodeURIComponent(eventId)}`);

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load event.");
    }

    eventData = result.event || result.data;

    if (!eventData) {
      throw new Error("Event details are unavailable.");
    }

    renderBookingPage();
  } catch (error) {
    console.error("Booking page error:", error);

    bookingContent.innerHTML = `
      <div class="error-state">
        <h2>Unable to load event</h2>
        <p>${escapeHtml(error.message)}</p>
        <a href="/events" class="back-events-btn">Back to Events</a>
      </div>
    `;
  }
};

const renderBookingPage = () => {
  const parsedDate = new Date(eventData.eventDate);

  const eventDate = Number.isNaN(parsedDate.getTime())
    ? "Date unavailable"
    : parsedDate.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });

  const tickets = Array.isArray(eventData.tickets) ? eventData.tickets : [];

  selectedTickets = {};

  bookingContent.innerHTML = `
    <div class="booking-header">
      <div>
        <span class="section-label">BOOK TICKETS</span>
        <h1>${escapeHtml(eventData.eventName)}</h1>
        <p>
          ${eventDate} ·
          ${escapeHtml(eventData.startTime || "")} -
          ${escapeHtml(eventData.endTime || "")}
        </p>
      </div>
    </div>

    <div class="booking-layout">
      <section class="ticket-selection">
        <div class="section-title">
          <h2>Select Tickets</h2>
          <p>Choose the number of tickets you want.</p>
        </div>

        <div class="ticket-list">
          ${
            tickets.length === 0
              ? `
                <div class="empty-state">
                  Tickets are currently unavailable.
                </div>
              `
              : tickets
                  .map((ticket) => {
                    const available = getAvailableQuantity(ticket);
                    const ticketId = String(ticket._id);

                    selectedTickets[ticketId] = 0;

                    return `
                      <div class="ticket-item">
                        <div class="ticket-details">
                          <h3>${escapeHtml(ticket.name)}</h3>
                          <strong>${formatCurrency(ticket.price)}</strong>
                          <span id="availability-${escapeHtml(ticketId)}">
                            ${
                              available > 0
                                ? `${available} available`
                                : "Sold out"
                            }
                          </span>
                        </div>

                        <div class="quantity-control">
                          <button
                            type="button"
                            class="quantity-btn"
                            data-action="decrease"
                            data-ticket-id="${escapeHtml(ticketId)}"
                            ${available === 0 ? "disabled" : ""}
                            aria-label="Decrease ${escapeHtml(ticket.name)} quantity"
                          >−</button>

                          <span
                            class="quantity-value"
                            id="quantity-${escapeHtml(ticketId)}"
                          >0</span>

                          <button
                            type="button"
                            class="quantity-btn"
                            data-action="increase"
                            data-ticket-id="${escapeHtml(ticketId)}"
                            data-available="${available}"
                            ${available === 0 ? "disabled" : ""}
                            aria-label="Increase ${escapeHtml(ticket.name)} quantity"
                          >+</button>
                        </div>
                      </div>
                    `;
                  })
                  .join("")
          }
        </div>
      </section>

      <aside class="booking-summary">
        <h2>Booking Summary</h2>

        <div id="summary-items">
          <p class="summary-empty">No tickets selected.</p>
        </div>

        <div class="summary-total">
          <span>Total</span>
          <strong id="total-amount">${formatCurrency(0)}</strong>
        </div>

        <button
          type="button"
          id="continue-payment-btn"
          class="continue-btn"
          disabled
        >
          Continue to Payment
        </button>
      </aside>
    </div>
  `;

  updateSummary();
};

const updateSummary = () => {
  const summaryItems = document.getElementById("summary-items");
  const totalAmount = document.getElementById("total-amount");
  const continueButton = document.getElementById("continue-payment-btn");

  if (!summaryItems || !totalAmount || !continueButton || !eventData) {
    return;
  }

  let total = 0;
  const selectedItems = [];

  eventData.tickets.forEach((ticket) => {
    const ticketId = String(ticket._id);
    const quantity = selectedTickets[ticketId] || 0;

    if (quantity > 0) {
      const subtotal = Number(ticket.price) * quantity;
      total += subtotal;

      selectedItems.push({
        ticketName: ticket.name,
        quantity,
        price: Number(ticket.price),
        subtotal,
      });
    }
  });

  if (selectedItems.length === 0) {
    summaryItems.innerHTML = `
      <p class="summary-empty">No tickets selected.</p>
    `;
  } else {
    summaryItems.innerHTML = selectedItems
      .map(
        (item) => `
          <div class="summary-item">
            <div>
              <strong>${escapeHtml(item.ticketName)}</strong>
              <span>
                ${formatCurrency(item.price)} × ${item.quantity}
              </span>
            </div>
            <strong>${formatCurrency(item.subtotal)}</strong>
          </div>
        `,
      )
      .join("");
  }

  totalAmount.textContent = formatCurrency(total);

  continueButton.disabled = selectedItems.length === 0 || isProcessingPayment;
};

const changeQuantity = (ticketId, action, available) => {
  if (isProcessingPayment) {
    return;
  }

  const currentQuantity = selectedTickets[ticketId] || 0;

  if (action === "increase") {
    if (currentQuantity >= available) {
      showMessage("No more tickets are available.", "warning");
      return;
    }

    selectedTickets[ticketId] = Math.min(currentQuantity + 1, available);
  }

  if (action === "decrease") {
    if (currentQuantity <= 0) {
      return;
    }

    selectedTickets[ticketId] = currentQuantity - 1;
  }

  const quantityElement = document.getElementById(`quantity-${ticketId}`);

  if (quantityElement) {
    quantityElement.textContent = selectedTickets[ticketId];
  }

  updateSummary();
};

const setProcessingState = (processing, text = "Continue to Payment") => {
  isProcessingPayment = processing;

  const continueButton = document.getElementById("continue-payment-btn");

  if (continueButton) {
    continueButton.textContent = processing ? text : "Continue to Payment";
  }

  document.querySelectorAll(".quantity-btn").forEach((button) => {
    const ticketId = button.dataset.ticketId;
    const currentQuantity = selectedTickets[ticketId] || 0;
    const available = Number(button.dataset.available) || 0;

    button.disabled =
      processing ||
      (button.dataset.action === "increase" && currentQuantity >= available) ||
      (button.dataset.action === "decrease" && currentQuantity <= 0);
  });

  updateSummary();
};

const recordPaymentFailure = async (
  razorpayOrderId,
  razorpayPaymentId,
  failureReason,
) => {
  try {
    await authenticatedFetch("/api/payments/failure", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        razorpayOrderId,
        razorpayPaymentId,
        failureReason,
      }),
    });
  } catch (error) {
    console.error("Unable to record payment failure:", error);
  }
};

const openRazorpayCheckout = (booking, orderData) =>
  new Promise((resolve, reject) => {
    if (typeof window.Razorpay !== "function") {
      reject(new Error("Razorpay Checkout could not be loaded."));
      return;
    }

    const key = bookingContent.dataset.razorpayKey;

    if (!key) {
      reject(new Error("Razorpay key ID is not configured."));
      return;
    }

    if (!orderData.razorpayOrderId || !orderData.amount) {
      reject(new Error("Razorpay order details are incomplete."));
      return;
    }

    const options = {
      key,
      amount: orderData.amount,
      currency: orderData.currency || "INR",
      name: "Eventure",
      description: `Tickets for ${eventData.eventName}`,
      order_id: orderData.razorpayOrderId,
      prefill: {},
      notes: {
        bookingReference: booking.bookingReference || "",
      },
      theme: {
        color: "#4f46c8",
      },
      handler: async (paymentResponse) => {
        try {
          setProcessingState(true, "Verifying Payment...");

          const { response, result } = await authenticatedFetch(
            "/api/payments/verify",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpaySignature: paymentResponse.razorpay_signature,
              }),
            },
          );

          if (!response.ok || !result.success) {
            throw new Error(result.message || "Payment verification failed.");
          }

          await Swal.fire({
            icon: "success",
            title: "Payment Successful",
            text: "Your booking has been confirmed.",
            confirmButtonText: "View My Tickets",
          });

          window.location.replace("/user/bookings");
          resolve(result);
        } catch (error) {
          console.error("Payment verification error:", error);

          await Swal.fire({
            icon: "error",
            title: "Verification Pending",
            text: "We could not confirm the payment yet. Please check My Tickets before attempting another payment.",
            confirmButtonText: "View My Tickets",
          });

          window.location.replace("/user/bookings");
          reject(error);
        }
      },
      modal: {
        ondismiss: async () => {
          setProcessingState(false);

          await Swal.fire({
            icon: "info",
            title: "Payment Not Completed",
            text: "Your booking has not been confirmed. You can retry payment if your reservation is still valid.",
            confirmButtonText: "OK",
          });

          resolve({ dismissed: true });
        },
      },
    };

    const checkout = new window.Razorpay(options);

    checkout.on("payment.failed", async (event) => {
      const error = event.error || {};

      await recordPaymentFailure(
        orderData.razorpayOrderId,
        error.metadata?.payment_id,
        error.description || error.reason || "Payment failed",
      );

      setProcessingState(false);

      await Swal.fire({
        icon: "error",
        title: "Payment Failed",
        text:
          error.description ||
          "Your payment could not be completed. You can try again.",
        confirmButtonText: "OK",
      });

      resolve({ failed: true });
    });

    checkout.open();
  });

const createBooking = async () => {
  if (isProcessingPayment) {
    return;
  }

  const tickets = Object.entries(selectedTickets)
    .filter(([, quantity]) => quantity > 0)
    .map(([ticketId, quantity]) => ({
      ticketId,
      quantity,
    }));

  if (tickets.length === 0) {
    showMessage("Please select at least one ticket.", "warning");
    return;
  }

  try {
    setProcessingState(true, "Creating Booking...");

    const { response: bookingResponse, result: bookingResult } =
      await authenticatedFetch("/api/events/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId,
          tickets,
        }),
      });

    if (!bookingResponse.ok || !bookingResult.success) {
      throw new Error(bookingResult.message || "Unable to create booking.");
    }

    const booking = bookingResult.booking;

    if (!booking?._id) {
      throw new Error("The server did not return a booking ID.");
    }

    setProcessingState(true, "Creating Payment Order...");

    const { response: orderResponse, result: orderResult } =
      await authenticatedFetch(
        `/api/payments/${encodeURIComponent(booking._id)}/order`,
        {
          method: "POST",
        },
      );

    if (!orderResponse.ok || !orderResult.success) {
      throw new Error(orderResult.message || "Unable to create payment order.");
    }

    await openRazorpayCheckout(booking, orderResult.data);
  } catch (error) {
    console.error("Booking/payment error:", error);

    if (error.message !== "Authentication required.") {
      await Swal.fire({
        icon: "error",
        title: "Unable to Continue",
        text: error.message || "Something went wrong.",
        confirmButtonText: "OK",
      });
    }
  } finally {
    if (window.location.pathname.startsWith("/booking/")) {
      setProcessingState(false);
    }
  }
};

document.addEventListener("click", (event) => {
  const button = event.target.closest(".quantity-btn");

  if (!button || button.disabled) {
    return;
  }

  changeQuantity(
    button.dataset.ticketId,
    button.dataset.action,
    Number(button.dataset.available),
  );
});

document.addEventListener("click", (event) => {
  if (event.target.closest("#continue-payment-btn")) {
    createBooking();
  }
});

if (token && bookingContent) {
  loadEvent();
}
