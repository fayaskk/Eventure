let attendedEvents = [];

const getAttendedEventsToken = () =>
localStorage.getItem("token") ||
localStorage.getItem("accessToken") ||
sessionStorage.getItem("token") ||
sessionStorage.getItem("accessToken");

const escapeAttendedHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatAttendedEventDate = (date) => {
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

const getAttendedBannerUrl = (banner) => {
try {
const url = new URL(banner);


if (url.protocol === "https:") {
  return escapeAttendedHtml(url.href);
}


} catch {
return "";
}

return "";
};

const renderAttendedEvents = () => {
const container = document.getElementById("attended-events-container");
const countElement = document.getElementById("attended-count");

if (!container || !countElement) return;

const count = attendedEvents.length;

countElement.textContent = `${count} event${count === 1 ? "" : "s"} attended`;

if (count === 0) {
container.innerHTML = `       <div class="attended-message">         <h3>No attended events yet</h3>         <p>Events you've attended will appear here.</p>         <a href="/events" class="btn btn-primary">Explore Events</a>       </div>
    `;


return;


}

container.innerHTML = attendedEvents
.map((event) => {
const eventId = escapeAttendedHtml(event._id);
const eventName = escapeAttendedHtml(event.eventName);
const bannerUrl = getAttendedBannerUrl(event.banner);
const eventDate = escapeAttendedHtml(
formatAttendedEventDate(event.eventDate),
);
const startTime = escapeAttendedHtml(event.startTime || "Time unavailable");
const city = escapeAttendedHtml(
event.location?.city || "Location unavailable",
);


  const feedback = event.feedback;
  const hasFeedback =
    feedback &&
    Number.isInteger(feedback.rating) &&
    feedback.rating >= 1 &&
    feedback.rating <= 5;

  const bannerHtml = bannerUrl
    ? `
      <img
        src="${bannerUrl}"
        alt="${eventName}"
        class="attended-event-banner"
        loading="lazy"
      />
    `
    : `
      <div class="attended-event-banner attended-banner-placeholder">
        <i class="bi bi-calendar-event"></i>
      </div>
    `;

  const feedbackHtml = hasFeedback
    ? `
      <div class="existing-feedback">
        <h4>Your Feedback</h4>

        <p class="feedback-rating" aria-label="${feedback.rating} out of 5 stars">
          ${"★".repeat(feedback.rating)}${"☆".repeat(5 - feedback.rating)}
          <span>${feedback.rating}/5</span>
        </p>

        <p class="feedback-comment">
          ${escapeAttendedHtml(
            feedback.comment || "You didn't add a comment.",
          )}
        </p>

        <button
          type="button"
          class="feedback-action-btn edit-feedback-btn"
          data-event-id="${eventId}"
        >
          <i class="bi bi-pencil-square"></i>
          Edit Feedback
        </button>
      </div>
    `
    : `
      <div class="no-feedback">
        <p>How was your experience?</p>

        <button
          type="button"
          class="feedback-action-btn submit-feedback-btn"
          data-event-id="${eventId}"
        >
          <i class="bi bi-star"></i>
          Write Feedback
        </button>
      </div>
    `;

  return `
    <article class="attended-event-card">
      ${bannerHtml}

      <div class="attended-event-details">
        <h3>${eventName}</h3>

        <p>
          <i class="bi bi-calendar-event"></i>
          ${eventDate}
        </p>

        <p>
          <i class="bi bi-clock"></i>
          ${startTime}
        </p>

        <p>
          <i class="bi bi-geo-alt"></i>
          ${city}
        </p>

        <div class="event-feedback">
          ${feedbackHtml}
        </div>
      </div>
    </article>
  `;
})
.join("");


};

const clearAttendedEventsTokens = () => {
localStorage.removeItem("token");
localStorage.removeItem("accessToken");
sessionStorage.removeItem("token");
sessionStorage.removeItem("accessToken");
};

const loadAttendedEvents = async () => {
const token = getAttendedEventsToken();

if (!token) {
window.location.replace("/login");
return;
}

try {
const response = await fetch("/api/users/attended-events", {
headers: {
Authorization: `Bearer ${token}`,
},
});


const result = await response.json();

if (response.status === 401) {
  clearAttendedEventsTokens();

  await showMessage(
    "Your session has expired. Please log in again.",
    "warning",
  );

  window.location.replace("/login");
  return;
}

if (!response.ok || !result.success) {
  showMessage(
    result.message || "Failed to fetch attended events.",
    "error",
  );
  return;
}

attendedEvents = Array.isArray(result.data) ? result.data : [];

renderAttendedEvents();


} catch (error) {
console.error("Fetch attended events error:", error);


showMessage(
  "Something went wrong while loading your attended events. Please try again.",
  "error",
);


}
};

const openFeedbackPopup = async (eventId, existingFeedback = null) => {
const isEditing = Boolean(existingFeedback);
const initialRating = isEditing ? existingFeedback.rating : 5;
const initialComment = escapeAttendedHtml(
existingFeedback?.comment || "",
);

const { value: formValues } = await Swal.fire({
title: isEditing ? "Edit Your Feedback" : "Share Your Experience",
html: ` <div class="feedback-popup"> <label for="feedback-rating">Your Rating</label>


    <select id="feedback-rating" class="swal2-select">
      <option value="5" ${initialRating === 5 ? "selected" : ""}>5 - Excellent</option>
      <option value="4" ${initialRating === 4 ? "selected" : ""}>4 - Very Good</option>
      <option value="3" ${initialRating === 3 ? "selected" : ""}>3 - Good</option>
      <option value="2" ${initialRating === 2 ? "selected" : ""}>2 - Fair</option>
      <option value="1" ${initialRating === 1 ? "selected" : ""}>1 - Poor</option>
    </select>

    <label for="feedback-comment">Your Comment (Optional)</label>

    <textarea
      id="feedback-comment"
      class="swal2-textarea"
      maxlength="1000"
      placeholder="Tell us about your experience..."
    >${initialComment}</textarea>

    <small class="feedback-character-count">0/1000 characters</small>
  </div>
`,
showCancelButton: true,
confirmButtonText: isEditing ? "Save Changes" : "Submit Feedback",
cancelButtonText: "Cancel",
focusConfirm: false,
didOpen: () => {
  const commentField = document.getElementById("feedback-comment");
  const characterCount = document.querySelector(
    ".feedback-character-count",
  );

  const updateCharacterCount = () => {
    characterCount.textContent = `${commentField.value.length}/1000 characters`;
  };

  commentField.addEventListener("input", updateCharacterCount);

  updateCharacterCount();
},
preConfirm: () => {
  const rating = Number(
    document.getElementById("feedback-rating").value,
  );

  const comment = document
    .getElementById("feedback-comment")
    .value.trim();

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    Swal.showValidationMessage("Please select a rating from 1 to 5.");
    return false;
  }

  if (comment.length > 1000) {
    Swal.showValidationMessage(
      "Your comment cannot exceed 1000 characters.",
    );
    return false;
  }

  return { rating, comment };
},


});

if (!formValues) return;

await saveFeedback(eventId, formValues, isEditing);
};

const saveFeedback = async (eventId, formValues, isEditing) => {
const token = getAttendedEventsToken();

if (!token) {
window.location.replace("/login");
return;
}

const endpoint = isEditing
? `/api/users/events/${encodeURIComponent(eventId)}/feedback`
: `/api/users/events/${encodeURIComponent(eventId)}/feedback`;

const method = isEditing ? "PATCH" : "POST";

Swal.fire({
title: isEditing ? "Saving Changes..." : "Submitting Feedback...",
allowOutsideClick: false,
allowEscapeKey: false,
didOpen: () => {
Swal.showLoading();
},
});

try {
const response = await fetch(endpoint, {
method,
headers: {
Authorization: `Bearer ${token}`,
"Content-Type": "application/json",
},
body: JSON.stringify(formValues),
});


const result = await response.json();

if (response.status === 401) {
  Swal.close();
  clearAttendedEventsTokens();

  await showMessage(
    "Your session has expired. Please log in again.",
    "warning",
  );

  window.location.replace("/login");
  return;
}

if (!response.ok || !result.success) {
  Swal.close();

  showMessage(
    result.message || "Unable to save your feedback.",
    "error",
  );

  return;
}

Swal.close();

await showMessage(
  isEditing
    ? "Your feedback has been updated successfully!"
    : "Thank you! Your feedback has been submitted.",
  "success",
);

await loadAttendedEvents();


} catch (error) {
console.error("Save feedback error:", error);


Swal.close();

showMessage(
  "Something went wrong while saving your feedback. Please try again.",
  "error",
);


}
};

document.addEventListener("DOMContentLoaded", loadAttendedEvents);

document.addEventListener("click", async (clickEvent) => {
const editButton = clickEvent.target.closest(".edit-feedback-btn");
const submitButton = clickEvent.target.closest(".submit-feedback-btn");

const button = editButton || submitButton;

if (!button) return;

const eventId = button.dataset.eventId;

const selectedEvent = attendedEvents.find(
(item) => String(item._id) === String(eventId),
);

if (!selectedEvent) {
showMessage("The selected event could not be found.", "error");
return;
}

await openFeedbackPopup(
eventId,
editButton ? selectedEvent.feedback : null,
);
});
