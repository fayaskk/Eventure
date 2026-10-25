const token = sessionStorage.getItem("token") || localStorage.getItem("token");

const eventId = window.location.pathname.split("/").at(-2);

const editEventForm = document.getElementById("editEventForm");
const categorySelect = document.getElementById("category");
const ticketsContainer = document.getElementById("ticketsContainer");
const addTicketBtn = document.getElementById("addTicketBtn");
const updateEventBtn = document.getElementById("updateEventBtn");

const currentBanner = document.getElementById("currentBanner");
const bannerInput = document.getElementById("banner");
const newBannerPreview = document.getElementById("newBannerPreview");
const newBannerImage = document.getElementById("newBannerImage");

const currentPromoVideoSection = document.getElementById(
  "currentPromoVideoSection",
);
const currentPromoVideo = document.getElementById("currentPromoVideo");
const promoVideoInput = document.getElementById("promoVideo");
const newPromoVideoPreview = document.getElementById("newPromoVideoPreview");
const newPromoVideo = document.getElementById("newPromoVideo");
const promoVideoError = document.getElementById("promoVideoError");
const removePromoVideoBtn = document.getElementById("removePromoVideoBtn");

let currentBannerUrl = "";
let currentPromoVideoUrl = "";
let currentEvent = null;
let isSubmitting = false;
let previewObjectUrl = null;

const getAuthToken = () =>
  sessionStorage.getItem("token") || localStorage.getItem("token");

const showMessage = async (message, icon = "error") => {
  await Swal.fire({
    icon,
    title:
      icon === "error"
        ? "Error"
        : icon === "warning"
          ? "Check your details"
          : "Notice",
    text: message,
  });
};

const handleUnauthorized = async (message) => {
  await Swal.fire({
    icon: "error",
    title: "Authentication required",
    text: message || "Please login again.",
    confirmButtonText: "Login",
  });

  localStorage.removeItem("token");
  sessionStorage.removeItem("token");

  window.location.replace("/login");
};

const clearVideoPreview = () => {
  newPromoVideo.pause();
  newPromoVideo.removeAttribute("src");
  newPromoVideo.load();

  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
    previewObjectUrl = null;
  }

  newPromoVideoPreview.hidden = true;
};

const displayCurrentPromoVideo = (videoUrl) => {
  currentPromoVideoUrl = videoUrl || "";

  currentPromoVideo.pause();
  currentPromoVideo.removeAttribute("src");

  if (currentPromoVideoUrl) {
    currentPromoVideo.src = currentPromoVideoUrl;
    currentPromoVideoSection.hidden = false;
    currentPromoVideo.load();
  } else {
    currentPromoVideoSection.hidden = true;
    currentPromoVideo.load();
  }
};

const loadCategories = async (selectedCategoryId) => {
  const response = await fetch("/api/categories");
  const result = await response.json();

  if (!response.ok || !result.success) {
    throw new Error(result.message || "Failed to fetch categories.");
  }

  categorySelect.replaceChildren();

  const defaultOption = document.createElement("option");
  defaultOption.value = "";
  defaultOption.textContent = "Select Category";
  categorySelect.appendChild(defaultOption);

  result.data.forEach((category) => {
    const option = document.createElement("option");
    option.value = category._id;
    option.textContent = category.name;
    option.selected = category._id === selectedCategoryId;
    categorySelect.appendChild(option);
  });
};

const addTicket = (ticket = {}) => {
  const ticketId = ticket._id
    ? String(ticket._id)
    : `new-${crypto.randomUUID()}`;

  const ticketCard = document.createElement("div");
  ticketCard.className = "ticket-card";
  ticketCard.dataset.ticketId = ticketId;

  const header = document.createElement("div");
  header.className = "ticket-card-header";

  const heading = document.createElement("h3");
  heading.textContent = "Ticket Type";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "remove-ticket-btn";
  removeButton.textContent = "Remove";

  removeButton.addEventListener("click", () => {
    ticketCard.remove();
  });

  header.append(heading, removeButton);

  const grid = document.createElement("div");
  grid.className = "ticket-grid";

  const fields = [
    {
      label: "Ticket Name",
      className: "ticket-name",
      type: "text",
      value: ticket.name ?? "",
      placeholder: "e.g. Gold",
    },
    {
      label: "Price (₹)",
      className: "ticket-price",
      type: "number",
      value: ticket.price ?? "",
      placeholder: "500",
      min: "0.01",
      step: "0.01",
    },
    {
      label: "Quantity",
      className: "ticket-quantity",
      type: "number",
      value: ticket.quantity ?? "",
      placeholder: "100",
      min: "1",
      step: "1",
    },
  ];

  fields.forEach((field) => {
    const group = document.createElement("div");
    group.className = "form-group";

    const label = document.createElement("label");
    label.textContent = field.label;

    const input = document.createElement("input");
    input.type = field.type;
    input.className = field.className;
    input.value = field.value;
    input.placeholder = field.placeholder;

    if (field.min !== undefined) input.min = field.min;
    if (field.step !== undefined) input.step = field.step;

    group.append(label, input);
    grid.appendChild(group);
  });

  ticketCard.append(header, grid);
  ticketsContainer.appendChild(ticketCard);
};

const setFieldError = (input, errorElement, message) => {
  input.classList.toggle("invalid", Boolean(message));

  if (errorElement) {
    errorElement.textContent = message;
  }
};

const validatePromoVideo = () => {
  const file = promoVideoInput.files[0];

  if (!file) {
    setFieldError(promoVideoInput, promoVideoError, "");
    return true;
  }

  const allowedTypes = ["video/mp4", "video/webm"];

  if (!allowedTypes.includes(file.type)) {
    setFieldError(
      promoVideoInput,
      promoVideoError,
      "Only MP4 and WebM videos are allowed.",
    );
    return false;
  }

  if (file.size > 5 * 1024 * 1024) {
    setFieldError(
      promoVideoInput,
      promoVideoError,
      "Promotional video must not exceed 5 MB.",
    );
    return false;
  }

  setFieldError(promoVideoInput, promoVideoError, "");
  return true;
};

const validateForm = () => {
  let valid = true;

  const eventName = document.getElementById("eventName");
  const description = document.getElementById("description");
  const category = document.getElementById("category");

  const eventNameError = eventName.value.trim()
    ? ""
    : "Event name is required.";

  setFieldError(
    eventName,
    document.getElementById("eventNameError"),
    eventNameError,
  );

  if (eventNameError) valid = false;

  const descriptionError =
    description.value.trim().length >= 20
      ? ""
      : "Description must be at least 20 characters.";

  setFieldError(
    description,
    document.getElementById("descriptionError"),
    descriptionError,
  );

  if (descriptionError) valid = false;

  const categoryError = category.value ? "" : "Please select a category.";

  setFieldError(
    category,
    document.getElementById("categoryError"),
    categoryError,
  );

  if (categoryError) valid = false;

  const locationFields = [
    ["venue", "Venue is required."],
    ["address", "Address is required."],
    ["city", "City is required."],
    ["state", "State is required."],
    ["pincode", "Pincode is required."],
  ];

  locationFields.forEach(([id, message]) => {
    const input = document.getElementById(id);
    const errorElement = document.getElementById(`${id}Error`);

    let fieldError = input.value.trim() ? "" : message;

    if (id === "pincode" && input.value.trim()) {
      if (!/^\d{6}$/.test(input.value.trim())) {
        fieldError = "Pincode must contain exactly 6 digits.";
      }
    }

    setFieldError(input, errorElement, fieldError);

    if (fieldError) valid = false;
  });

  const eventDate = document.getElementById("eventDate");
  const startTime = document.getElementById("startTime");
  const endTime = document.getElementById("endTime");

  let dateError = eventDate.value ? "" : "Event date is required.";

  if (eventDate.value) {
    const selectedDate = new Date(`${eventDate.value}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      dateError = "Please select today or a future event date.";
    }
  }

  setFieldError(
    eventDate,
    document.getElementById("eventDateError"),
    dateError,
  );

  if (dateError) valid = false;

  const startError = startTime.value ? "" : "Start time is required.";

  setFieldError(
    startTime,
    document.getElementById("startTimeError"),
    startError,
  );

  if (startError) valid = false;

  let endError = endTime.value ? "" : "End time is required.";

  if (startTime.value && endTime.value && startTime.value >= endTime.value) {
    endError = "End time must be after start time.";
  }

  setFieldError(endTime, document.getElementById("endTimeError"), endError);

  if (endError) valid = false;

  const ticketCards = Array.from(document.querySelectorAll(".ticket-card"));

  const ticketsError = document.getElementById("ticketsError");
  const ticketNames = new Set();
  let ticketError = "";

  if (ticketCards.length === 0) {
    ticketError = "At least one ticket type is required.";
  }

  ticketCards.forEach((card) => {
    const nameInput = card.querySelector(".ticket-name");
    const priceInput = card.querySelector(".ticket-price");
    const quantityInput = card.querySelector(".ticket-quantity");

    const name = nameInput.value.trim();
    const price = Number(priceInput.value);
    const quantity = Number(quantityInput.value);

    if (!name) {
      ticketError = "Every ticket must have a name.";
    } else if (ticketNames.has(name.toLowerCase())) {
      ticketError = "Ticket names must be unique.";
    }

    ticketNames.add(name.toLowerCase());

    if (
      priceInput.value.trim() === "" ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      ticketError = "Ticket prices must be greater than zero.";
    }

    if (
      quantityInput.value.trim() === "" ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      ticketError = "Ticket quantities must be positive integers.";
    }

    const ticketId = card.dataset.ticketId;

    const existingTicket = currentEvent?.tickets?.find(
      (ticket) => String(ticket._id) === ticketId,
    );

    if (existingTicket) {
      const committedQuantity =
        (existingTicket.sold ?? 0) + (existingTicket.reserved ?? 0);

      if (quantity < committedQuantity) {
        ticketError = `Quantity for ${name || "this ticket"} cannot be less than sold plus reserved tickets (${committedQuantity}).`;
      }
    }
  });

  if (ticketsError) {
    ticketsError.textContent = ticketError;
  }

  if (ticketError) valid = false;

  if (!validatePromoVideo()) {
    valid = false;
  }

  return valid;
};

const getEditableEventData = (event) => {
  if (event.status === "draft" || event.status === "rejected") {
    return {
      mode: "normal",
      data: event,
    };
  }

  if (event.status === "approved" && event.editRequestStatus === "editing") {
    return {
      mode: "approved-edit",
      data: event,
    };
  }

  if (
    event.status === "approved" &&
    event.editRequestStatus === "rejected" &&
    event.pendingEdit
  ) {
    return {
      mode: "resubmit",
      data: {
        ...event,
        ...event.pendingEdit,
        banner: event.pendingEdit.banner || event.banner,
        promoVideo: event.pendingEdit.promoVideo ?? event.promoVideo ?? null,
        tickets: event.pendingEdit.tickets || event.tickets,
        location: event.pendingEdit.location || event.location,
        bookingPolicy: event.pendingEdit.bookingPolicy || event.bookingPolicy,
      },
    };
  }

  return null;
};

const getEventDetails = async () => {
  try {
    const authToken = getAuthToken();

    if (!authToken) {
      await handleUnauthorized("Please login before editing an event.");
      return;
    }

    if (!eventId) {
      throw new Error("Invalid event URL.");
    }

    const response = await fetch(`/api/host/events/${eventId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      await handleUnauthorized(result.message);
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch event.");
    }

    currentEvent = result.data;

    const editable = getEditableEventData(currentEvent);

    if (!editable) {
      await Swal.fire({
        icon: "info",
        title: "Event cannot be edited",
        text: "This event is not currently available for editing.",
        confirmButtonText: "Back to Events",
      });

      window.location.href = "/host/events";
      return;
    }

    const event = editable.data;

    editEventForm.dataset.editMode = editable.mode;

    if (editable.mode === "resubmit") {
      updateEventBtn.textContent = "Resubmit Changes";
    }

    await loadCategories(event.category?._id || event.category || "");

    document.getElementById("eventName").value = event.eventName || "";
    document.getElementById("description").value = event.description || "";

    currentBannerUrl = event.banner || "";

    if (currentBanner) {
      currentBanner.src = currentBannerUrl;
      currentBanner.hidden = !currentBannerUrl;
    }

    displayCurrentPromoVideo(event.promoVideo || "");

    document.getElementById("venue").value = event.location?.venue || "";
    document.getElementById("address").value = event.location?.address || "";
    document.getElementById("city").value = event.location?.city || "";
    document.getElementById("state").value = event.location?.state || "";
    document.getElementById("pincode").value = event.location?.pincode || "";

    document.getElementById("eventDate").value = event.eventDate
      ? new Date(event.eventDate).toISOString().split("T")[0]
      : "";

    document.getElementById("startTime").value = event.startTime || "";
    document.getElementById("endTime").value = event.endTime || "";

    document.getElementById("allowAfterStart").checked =
      event.bookingPolicy?.allowAfterStart ?? false;

    ticketsContainer.replaceChildren();

    if (event.tickets?.length) {
      event.tickets.forEach((ticket) => addTicket(ticket));
    } else {
      addTicket();
    }
  } catch (error) {
    console.error("Edit Event Page Error:", error);

    await Swal.fire({
      icon: "error",
      title: "Unable to load event",
      text: error.message || "Failed to load event details.",
      confirmButtonText: "Back",
    });

    window.location.href = "/host/events";
  }
};

bannerInput.addEventListener("change", () => {
  const file = bannerInput.files[0];

  if (!file) {
    newBannerPreview.hidden = true;
    return;
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    bannerInput.value = "";
    newBannerPreview.hidden = true;
    showMessage("Only JPG, PNG and WEBP images are allowed.", "error");
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    bannerInput.value = "";
    newBannerPreview.hidden = true;
    showMessage("Banner image must not exceed 5 MB.", "error");
    return;
  }

  newBannerImage.src = URL.createObjectURL(file);
  newBannerPreview.hidden = false;
});

promoVideoInput.addEventListener("change", () => {
  clearVideoPreview();

  if (!promoVideoInput.files.length) {
    setFieldError(promoVideoInput, promoVideoError, "");
    return;
  }

  if (!validatePromoVideo()) {
    promoVideoInput.value = "";
    return;
  }

  const file = promoVideoInput.files[0];

  previewObjectUrl = URL.createObjectURL(file);
  newPromoVideo.src = previewObjectUrl;
  newPromoVideoPreview.hidden = false;
});

removePromoVideoBtn.addEventListener("click", () => {
  promoVideoInput.value = "";
  clearVideoPreview();
  setFieldError(promoVideoInput, promoVideoError, "");
});

addTicketBtn.addEventListener("click", () => {
  addTicket();
});

editEventForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSubmitting) return;

  if (!validateForm()) {
    await showMessage("Please correct the highlighted fields.", "warning");
    return;
  }

  const authToken = getAuthToken();

  if (!authToken) {
    await handleUnauthorized("Please login again.");
    return;
  }

  const mode = editEventForm.dataset.editMode || "normal";

  if (mode === "resubmit") {
    const confirmation = await Swal.fire({
      icon: "question",
      title: "Resubmit event changes?",
      text: "Your corrected changes will be sent to the admin for review.",
      showCancelButton: true,
      confirmButtonText: "Resubmit",
      cancelButtonText: "Cancel",
    });

    if (!confirmation.isConfirmed) return;
  }

  isSubmitting = true;
  updateEventBtn.disabled = true;

  const originalButtonText = updateEventBtn.textContent;

  updateEventBtn.textContent =
    mode === "resubmit" ? "Resubmitting..." : "Submitting...";

  try {
    const formData = new FormData();

    formData.append(
      "eventName",
      document.getElementById("eventName").value.trim(),
    );

    formData.append(
      "description",
      document.getElementById("description").value.trim(),
    );

    formData.append("category", categorySelect.value);

    formData.append(
      "location",
      JSON.stringify({
        venue: document.getElementById("venue").value.trim(),
        address: document.getElementById("address").value.trim(),
        city: document.getElementById("city").value.trim(),
        state: document.getElementById("state").value.trim(),
        pincode: document.getElementById("pincode").value.trim(),
      }),
    );

    formData.append("eventDate", document.getElementById("eventDate").value);
    formData.append("startTime", document.getElementById("startTime").value);
    formData.append("endTime", document.getElementById("endTime").value);

    const tickets = Array.from(document.querySelectorAll(".ticket-card")).map(
      (card) => {
        const ticketId = card.dataset.ticketId;

        const ticket = {
          name: card.querySelector(".ticket-name").value.trim(),
          price: Number(card.querySelector(".ticket-price").value),
          quantity: Number(card.querySelector(".ticket-quantity").value),
        };

        if (ticketId && !ticketId.startsWith("new-")) {
          ticket._id = ticketId;
        }

        return ticket;
      },
    );

    formData.append("tickets", JSON.stringify(tickets));

    formData.append(
      "bookingPolicy",
      JSON.stringify({
        allowAfterStart: document.getElementById("allowAfterStart").checked,
      }),
    );

    const newBanner = bannerInput.files[0];

    if (newBanner) {
      formData.append("banner", newBanner);
    }

    const newVideo = promoVideoInput.files[0];

    if (newVideo) {
      formData.append("promoVideo", newVideo);
    }

    const endpoint =
      mode === "resubmit"
        ? `/api/host/events/${eventId}/resubmit`
        : `/api/host/events/${eventId}`;

    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      body: formData,
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      await handleUnauthorized(result.message);
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to submit event changes.");
    }

    await Swal.fire({
      icon: "success",
      title: mode === "resubmit" ? "Changes resubmitted" : "Changes submitted",
      text:
        result.message ||
        (mode === "resubmit"
          ? "Your corrected changes have been sent for admin review."
          : "Your event changes have been submitted successfully."),
      confirmButtonText: "Continue",
    });

    window.location.href = "/host/events";
  } catch (error) {
    console.error("Update Event Error:", error);

    await showMessage(error.message || "Failed to update event.", "error");
  } finally {
    isSubmitting = false;
    updateEventBtn.disabled = false;
    updateEventBtn.textContent = originalButtonText;
  }
});

window.addEventListener("beforeunload", () => {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl);
  }
});

getEventDetails();
