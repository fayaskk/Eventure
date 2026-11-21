const getFeedbackToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken");

const feedbackState = {
  events: [],
  selectedEventId: "",
  currentPage: 1,
  limit: 10,
  totalPages: 1,
};

const escapeFeedbackHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatFeedbackDate = (date) => {
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

const showFeedbackMessage = async (message, icon = "error") => {
  if (typeof Swal !== "undefined") {
    await Swal.fire({
      title: icon === "success" ? "Success" : "Notice",
      text: message,
      icon,
      confirmButtonColor: "#5542e8",
    });
    return;
  }

  window.alert(message);
};

const clearFeedbackTokens = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("accessToken");
};

const feedbackFetch = async (url) => {
  const token = getFeedbackToken();

  if (!token) {
    window.location.replace("/login");
    throw new Error("Authentication required.");
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  const result = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearFeedbackTokens();
    await showFeedbackMessage(
      "Your session has expired. Please log in again.",
      "warning",
    );
    window.location.replace("/login");
    throw new Error("Authentication required.");
  }

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Unable to load feedback data.");
  }

  return result.data;
};

const setFeedbackLoading = (container, message) => {
  container.innerHTML = `     <div class="feedback-message">       <div class="loading-spinner"></div>       <p>${escapeFeedbackHtml(message)}</p>     </div>
  `;
};

const renderFeedbackEmptyState = (container, message) => {
  container.innerHTML = `     <div class="feedback-message">       <p>${escapeFeedbackHtml(message)}</p>     </div>
  `;
};

const renderFeedbackError = (container, message) => {
  container.innerHTML = `     <div class="feedback-message attended-error">       <p>${escapeFeedbackHtml(message)}</p>       <button type="button" id="retry-feedback-loading">
        Try Again       </button>     </div>
  `;
};

const loadFeedbackSummary = async () => {
  const data = await feedbackFetch("/api/host/feedback/summary");

  document.getElementById("total-reviews").textContent = data.totalReviews ?? 0;

  const averageRating = Number(data.averageRating ?? 0);

  document.getElementById("average-rating").innerHTML =
    `     ${averageRating.toFixed(1)} <span>/ 5</span>
  `;

  document.getElementById("events-with-feedback").textContent =
    data.eventsWithFeedback ?? 0;

  document.getElementById("average-rating-stars").textContent =
    "★".repeat(Math.round(averageRating)) +
    "☆".repeat(5 - Math.round(averageRating));

  const ratingCounts = [
    { rating: 5, count: data.fiveStarReviews ?? 0 },
    { rating: 4, count: data.fourStarReviews ?? 0 },
    { rating: 3, count: data.threeStarReviews ?? 0 },
    { rating: 2, count: data.twoStarReviews ?? 0 },
    { rating: 1, count: data.oneStarReviews ?? 0 },
  ];

  const totalReviews = Number(data.totalReviews ?? 0);

  ratingCounts.forEach(({ rating, count }) => {
    const progress = document.querySelector(
      `.rating-progress-fill[data-rating="${rating}"]`,
    );

    const countElement = document.querySelector(
      `.rating-count[data-rating-count="${rating}"]`,
    );

    if (progress) {
      progress.style.width =
        totalReviews > 0 ? `${(count / totalReviews) * 100}%` : "0%";
    }

    if (countElement) {
      countElement.textContent = count;
    }
  });
};

const loadHostFeedbackEvents = async () => {
  const select = document.getElementById("feedback-event-select");

  select.innerHTML = `<option value="">Loading your events...</option>`;
  select.disabled = true;

  try {
    const events = await feedbackFetch("/api/host/feedback/events");

    feedbackState.events = Array.isArray(events) ? events : [];

    if (feedbackState.events.length === 0) {
      select.innerHTML = `<option value="">No events available</option>`;
      renderFeedbackEmptyState(
        document.getElementById("event-feedback-container"),
        "You have no events to display yet.",
      );
      document.getElementById("selected-event-summary").hidden = true;
      document.getElementById("feedback-pagination").hidden = true;
      return;
    }

    select.innerHTML = `
  <option value="">Choose an event</option>
  ${feedbackState.events
    .map(
      (event) => `
        <option value="${escapeFeedbackHtml(event._id)}">
          ${escapeFeedbackHtml(event.eventName)}
        </option>
      `,
    )
    .join("")}
`;

    select.disabled = false;

    const eventWithReviews = feedbackState.events.find(
      (event) => Number(event.totalReviews ?? 0) > 0,
    );

    if (eventWithReviews) {
      select.value = eventWithReviews._id;
      feedbackState.selectedEventId = eventWithReviews._id;
      await loadSelectedEventFeedback();
    } else {
      renderFeedbackEmptyState(
        document.getElementById("event-feedback-container"),
        "No reviews have been submitted for your events yet.",
      );
      document.getElementById("selected-event-summary").hidden = true;
      document.getElementById("feedback-pagination").hidden = true;
    }
  } catch (error) {
    select.innerHTML = `<option value="">Unable to load events</option>`;
    select.disabled = true;

    renderFeedbackError(
      document.getElementById("event-feedback-container"),
      error.message,
    );

    throw error;
  }
};

const renderSelectedEventSummary = (event) => {
  const summary = document.getElementById("selected-event-summary");

  summary.hidden = false;
  summary.innerHTML = `    <div class="selected-event-info">       <h3>${escapeFeedbackHtml(event.eventName || "Event")}</h3>       <p>
        ${formatFeedbackDate(event.eventDate)}
        ${event.status ? ` · ${escapeFeedbackHtml(event.status)}` : ""}       </p>     </div>     <div class="selected-event-rating">       <strong>${Number(event.averageRating ?? 0).toFixed(1)}</strong>       <span>/ 5</span>       <p>${Number(event.totalReviews ?? 0)} review(s)</p>     </div>
 `;
};

const renderEventFeedback = (feedbacks) => {
  const container = document.getElementById("event-feedback-container");

  if (!Array.isArray(feedbacks) || feedbacks.length === 0) {
    renderFeedbackEmptyState(
      container,
      "No reviews have been submitted for this event yet.",
    );
    return;
  }

  container.innerHTML = ` <div class="feedback-reviews-list">
${feedbacks
  .map((feedback) => {
    const rating = Math.min(5, Math.max(0, Number(feedback.rating) || 0));

    const attendee = feedback.user || feedback.attendee || {};

    const attendeeName =
      feedback.reviewerName ||
      attendee.name ||
      attendee.fullName ||
      attendee.username ||
      "Event attendee";

    return `
        <article class="feedback-review-card">
          <div class="feedback-review-header">
            <div class="feedback-review-avatar">
              <i class="bi bi-person-circle"></i>
            </div>
            <div class="feedback-review-attendee">
              <h3>${escapeFeedbackHtml(attendeeName)}</h3>
              <p>${formatFeedbackDate(feedback.createdAt)}</p>
            </div>
            <div class="feedback-review-rating">
              ${"★".repeat(rating)}${"☆".repeat(5 - rating)}
              <span>${rating}/5</span>
            </div>
          </div>
          <p class="feedback-review-comment">
            ${
              feedback.comment
                ? escapeFeedbackHtml(feedback.comment)
                : "The attendee did not leave a comment."
            }
          </p>
        </article>
      `;
  })
  .join("")}
</div>


`;
};

const updateFeedbackPagination = (pagination = {}) => {
  const paginationElement = document.getElementById("feedback-pagination");

  const currentPage = Number(
    pagination.currentPage ?? pagination.page ?? feedbackState.currentPage,
  );

  const totalPages = Math.max(
    1,
    Number(pagination.totalPages ?? feedbackState.totalPages),
  );

  feedbackState.currentPage = currentPage;
  feedbackState.totalPages = totalPages;

  paginationElement.hidden = false;

  document.getElementById("feedback-page-info").textContent =
    `Page ${currentPage} of ${totalPages}`;

  document.getElementById("feedback-prev").disabled = currentPage <= 1;
  document.getElementById("feedback-next").disabled = currentPage >= totalPages;
};

const loadSelectedEventFeedback = async () => {
  const eventId = feedbackState.selectedEventId;

  if (!eventId) return;

  const container = document.getElementById("event-feedback-container");

  setFeedbackLoading(container, "Loading feedback...");

  try {
    const event = feedbackState.events.find((item) => item._id === eventId);

    if (event) {
      renderSelectedEventSummary(event);
    }

    const query = new URLSearchParams({
      page: String(feedbackState.currentPage),
      limit: String(feedbackState.limit),
    });

    const data = await feedbackFetch(
      `/api/host/feedback/events/${encodeURIComponent(eventId)}?${query}`,
    );

    const feedbacks = Array.isArray(data)
      ? data
      : data.feedbacks || data.reviews || data.data || [];

    renderEventFeedback(feedbacks);

    const pagination = Array.isArray(data) ? {} : data.pagination || data;

    updateFeedbackPagination(pagination);
  } catch (error) {
    renderFeedbackError(container, error.message);
    document.getElementById("feedback-pagination").hidden = true;
    await showFeedbackMessage(error.message, "error");
  }
};

const initializeHostFeedback = async () => {
  const container = document.getElementById("event-feedback-container");

  try {
    await Promise.all([loadFeedbackSummary(), loadHostFeedbackEvents()]);
  } catch (error) {
    console.error("Host feedback initialization failed:", error);
  }

  if (!feedbackState.events.length) {
    return;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("feedback-event-select");

  select.addEventListener("change", async (event) => {
    feedbackState.selectedEventId = event.target.value;
    feedbackState.currentPage = 1;

    if (!feedbackState.selectedEventId) {
      document.getElementById("selected-event-summary").hidden = true;
      document.getElementById("feedback-pagination").hidden = true;

      renderFeedbackEmptyState(
        document.getElementById("event-feedback-container"),
        "Choose an event to view its reviews.",
      );
      return;
    }

    await loadSelectedEventFeedback();
  });

  document
    .getElementById("feedback-prev")
    .addEventListener("click", async () => {
      if (feedbackState.currentPage <= 1) return;

      feedbackState.currentPage -= 1;
      await loadSelectedEventFeedback();
    });

  document
    .getElementById("feedback-next")
    .addEventListener("click", async () => {
      if (feedbackState.currentPage >= feedbackState.totalPages) return;

      feedbackState.currentPage += 1;
      await loadSelectedEventFeedback();
    });

  document.addEventListener("click", async (event) => {
    if (event.target.closest("#retry-feedback-loading")) {
      await initializeHostFeedback();
    }
  });

  initializeHostFeedback();
});
