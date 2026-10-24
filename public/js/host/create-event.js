"use strict";

/* =========================================================
   EVENT FORM STATE
========================================================= */

const eventForm = {
  eventName: "",
  description: "",
  category: "",
  banner: null,
  promoVideo: null,

  location: {
    venue: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  },

  eventDate: "",
  startTime: "",
  endTime: "",

  tickets: [],

  bookingPolicy: {
    allowAfterStart: false,
  },
};

/* =========================================================
   DOM HELPERS
========================================================= */

const getElement = (id) => document.getElementById(id);

const eventNameInput = getElement("eventName");
const descriptionInput = getElement("description");
const categoryInput = getElement("category");
const bannerInput = getElement("banner");

const uploadArea = getElement("uploadArea");
const uploadEmpty = getElement("uploadEmpty");
const uploadPreview = getElement("uploadPreview");
const bannerPreview = getElement("bannerPreview");
const bannerFileName = getElement("bannerFileName");
const bannerFileSize = getElement("bannerFileSize");

const browseBannerBtn = getElement("browseBannerBtn");
const removeBannerBtn = getElement("removeBannerBtn");

const promoVideoInput = getElement("promoVideo");
const promoPreview = getElement("promoPreview");
const promoPreviewWrapper = getElement("promoPreviewWrapper");
const promoFileName = getElement("promoFileName");
const promoVideoError = getElement("promoVideoError");
const browsePromoVideoBtn = getElement("browsePromoVideoBtn");
const removePromoVideoBtn = getElement("removePromoVideoBtn");

const previousBtn = getElement("previousBtn");
const nextBtn = getElement("nextBtn");
const saveDraftBtn = getElement("saveDraftBtn");
const cancelEventBtn = getElement("cancelEventBtn");

const wizardPanels = document.querySelectorAll(".wizard-panel");
const wizardSteps = document.querySelectorAll(".wizard-step");
const wizardLines = document.querySelectorAll(".wizard-line");

const stepLabel = getElement("stepLabel");
const stepTitle = getElement("stepTitle");
const stepDescription = getElement("stepDescription");

const progressPercentage = getElement("progressPercentage");
const progressBar = getElement("progressBar");

const ticketsContainer = getElement("ticketsContainer");
const noTicketsMessage = getElement("noTicketsMessage");
const addTicketBtn = getElement("addTicketBtn");
const reviewContainer = getElement("reviewContainer");

const createEventForm = getElement("createEventForm");

/* =========================================================
   STATE
========================================================= */

let currentStep = 1;

let bannerPreviewUrl = null;
let promoVideoPreviewUrl = null;

let isSubmitting = false;
let isSavingDraft = false;

const MAX_BANNER_SIZE = 5 * 1024 * 1024;
const MAX_VIDEO_SIZE = 5 * 1024 * 1024;

const ALLOWED_BANNER_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm"];

const stepInformation = {
  1: {
    label: "Step 1 of 5",
    title: "Basic Information",
    description: "Tell attendees about your event.",
  },

  2: {
    label: "Step 2 of 5",
    title: "Location & Schedule",
    description: "Set where and when your event will happen.",
  },

  3: {
    label: "Step 3 of 5",
    title: "Tickets",
    description: "Create ticket types and set their quantities.",
  },

  4: {
    label: "Step 4 of 5",
    title: "Booking Settings",
    description: "Configure how attendees can book your event.",
  },

  5: {
    label: "Step 5 of 5",
    title: "Review",
    description: "Review your event before submitting it.",
  },
};

/* =========================================================
   AUTHENTICATION
========================================================= */

const getAuthToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken")
  );
};

const redirectToLogin = async () => {
  if (typeof Swal !== "undefined") {
    await Swal.fire({
      icon: "error",
      title: "Authentication required",
      text: "Your session has expired. Please login again.",
      confirmButtonText: "Login",
    });
  } else {
    window.alert("Your session has expired. Please login again.");
  }

  window.location.href = "/login";
};

const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();

  if (!token) {
    await redirectToLogin();

    throw new Error("Authentication token not found.");
  }

  const headers = new Headers(options.headers || {});

  headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401 || response.status === 403) {
    await redirectToLogin();

    throw new Error("Authentication failed.");
  }

  return response;
};

/* =========================================================
   MESSAGES
========================================================= */

const showMessage = async (message, icon = "info") => {
  if (typeof Swal !== "undefined") {
    return Swal.fire({
      icon,
      text: message,
      confirmButtonText: "OK",
    });
  }

  window.alert(message);

  return null;
};

/* =========================================================
   WIZARD NAVIGATION
========================================================= */

const showStep = (step) => {
  if (step < 1 || step > 5) {
    return;
  }

  currentStep = step;

  wizardPanels.forEach((panel) => {
    const panelStep = Number(panel.dataset.panel);

    panel.classList.toggle("active", panelStep === currentStep);
  });

  wizardSteps.forEach((wizardStep) => {
    const stepNumber = Number(wizardStep.dataset.step);

    wizardStep.classList.toggle("active", stepNumber === currentStep);

    wizardStep.classList.toggle("completed", stepNumber < currentStep);
  });

  wizardLines.forEach((line) => {
    const lineNumber = Number(line.dataset.line);

    line.classList.toggle("completed", lineNumber < currentStep);
  });

  const information = stepInformation[currentStep];

  if (information) {
    if (stepLabel) {
      stepLabel.textContent = information.label;
    }

    if (stepTitle) {
      stepTitle.textContent = information.title;
    }

    if (stepDescription) {
      stepDescription.textContent = information.description;
    }
  }

  const progress = Math.round(((currentStep - 1) / 4) * 100);

  if (progressPercentage) {
    progressPercentage.textContent = `${progress}%`;
  }

  if (progressBar) {
    progressBar.style.width = `${progress}%`;
  }

  if (previousBtn) {
    previousBtn.disabled = currentStep === 1;
  }

  if (nextBtn) {
    nextBtn.textContent = currentStep === 5 ? "Submit Event" : "Continue →";
  }

  if (currentStep === 5) {
    renderReview();
  }
};

/* =========================================================
   CATEGORY LOADING
========================================================= */

const loadCategories = async () => {
  if (!categoryInput) {
    return;
  }

  try {
    const response = await fetch("/api/categories");

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to load categories.");
    }

    if (!Array.isArray(result.data)) {
      throw new Error("Invalid category response.");
    }

    categoryInput.replaceChildren();

    const placeholder = document.createElement("option");

    placeholder.value = "";
    placeholder.textContent = "Select an event category";

    categoryInput.appendChild(placeholder);

    result.data.forEach((category) => {
      const option = document.createElement("option");

      option.value = category._id;
      option.textContent = category.name;

      categoryInput.appendChild(option);
    });
  } catch (error) {
    console.error("Category loading error:", error);

    await showMessage(
      error.message || "Unable to load event categories.",
      "error",
    );
  }
};

/* =========================================================
   FIELD VALIDATION HELPERS
========================================================= */

const setFieldError = (input, errorElement, message) => {
  if (input) {
    input.classList.toggle("invalid", Boolean(message));
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }

  if (errorElement) {
    errorElement.textContent = message || "";
  }
};

/* =========================================================
   BASIC INFORMATION VALIDATION
========================================================= */

const validateEventName = () => {
  const error = getElement("eventNameError");

  const value = eventNameInput.value.trim();

  let message = "";

  if (!value) {
    message = "Event name is required.";
  } else if (value.length < 3) {
    message = "Event name must be at least 3 characters.";
  } else if (value.length > 100) {
    message = "Event name cannot exceed 100 characters.";
  }

  setFieldError(eventNameInput, error, message);

  if (message) {
    return false;
  }

  eventForm.eventName = value;

  return true;
};

const validateCategory = () => {
  const message = categoryInput.value ? "" : "Please select an event category.";

  setFieldError(categoryInput, getElement("categoryError"), message);

  if (message) {
    return false;
  }

  eventForm.category = categoryInput.value;

  return true;
};

const validateDescription = () => {
  const value = descriptionInput.value.trim();

  let message = "";

  if (!value) {
    message = "Event description is required.";
  } else if (value.length < 20) {
    message = "Description must be at least 20 characters.";
  } else if (value.length > 2000) {
    message = "Description cannot exceed 2000 characters.";
  }

  setFieldError(descriptionInput, getElement("descriptionError"), message);

  if (message) {
    return false;
  }

  eventForm.description = value;

  return true;
};

/* =========================================================
   FILE HELPERS
========================================================= */

const formatFileSize = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const revokeBannerPreviewUrl = () => {
  if (bannerPreviewUrl) {
    URL.revokeObjectURL(bannerPreviewUrl);

    bannerPreviewUrl = null;
  }
};

const revokePromoVideoPreviewUrl = () => {
  if (promoVideoPreviewUrl) {
    URL.revokeObjectURL(promoVideoPreviewUrl);

    promoVideoPreviewUrl = null;
  }
};

/* =========================================================
   BANNER VALIDATION AND PREVIEW
========================================================= */

const validateBanner = ({ required = true } = {}) => {
  const file = bannerInput.files?.[0];

  const error = getElement("bannerError");

  if (!file) {
    const message = required ? "Please upload an event banner." : "";

    if (uploadArea) {
      uploadArea.classList.toggle("invalid", Boolean(message));
    }

    if (error) {
      error.textContent = message;
    }

    eventForm.banner = null;

    return !required;
  }

  let message = "";

  if (!ALLOWED_BANNER_TYPES.includes(file.type)) {
    message = "Only JPG, PNG and WEBP images are allowed.";
  } else if (file.size > MAX_BANNER_SIZE) {
    message = "Banner image must not exceed 5 MB.";
  }

  if (uploadArea) {
    uploadArea.classList.toggle("invalid", Boolean(message));
  }

  if (error) {
    error.textContent = message;
  }

  if (message) {
    return false;
  }

  eventForm.banner = file;

  return true;
};

const displayBanner = (file) => {
  revokeBannerPreviewUrl();

  bannerPreviewUrl = URL.createObjectURL(file);

  if (bannerPreview) {
    bannerPreview.src = bannerPreviewUrl;
    bannerPreview.alt = file.name;
  }

  if (bannerFileName) {
    bannerFileName.textContent = file.name;
  }

  if (bannerFileSize) {
    bannerFileSize.textContent = formatFileSize(file.size);
  }

  if (uploadEmpty) {
    uploadEmpty.hidden = true;
  }

  if (uploadPreview) {
    uploadPreview.hidden = false;
  }
};

const handleBannerChange = () => {
  const file = bannerInput.files?.[0];

  if (!file) {
    return;
  }

  if (!validateBanner({ required: true })) {
    removeBanner();

    return;
  }

  displayBanner(file);
};

const removeBanner = () => {
  revokeBannerPreviewUrl();

  if (bannerInput) {
    bannerInput.value = "";
  }

  eventForm.banner = null;

  if (bannerPreview) {
    bannerPreview.removeAttribute("src");
  }

  if (bannerFileName) {
    bannerFileName.textContent = "";
  }

  if (bannerFileSize) {
    bannerFileSize.textContent = "";
  }

  if (uploadPreview) {
    uploadPreview.hidden = true;
  }

  if (uploadEmpty) {
    uploadEmpty.hidden = false;
  }

  if (uploadArea) {
    uploadArea.classList.remove("invalid");
  }

  const error = getElement("bannerError");

  if (error) {
    error.textContent = "";
  }
};

/* =========================================================
   PROMOTIONAL VIDEO VALIDATION
========================================================= */

const validatePromoVideo = () => {
  if (!promoVideoInput) {
    eventForm.promoVideo = null;

    return true;
  }

  const file = promoVideoInput.files?.[0];

  /*
   * Promotional video is optional.
   * No selected file is valid.
   */

  if (!file) {
    eventForm.promoVideo = null;

    if (promoVideoError) {
      promoVideoError.textContent = "";
    }

    return true;
  }

  let message = "";

  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    message = "Invalid video format. Please select an MP4 or WebM video.";
  } else if (file.size > MAX_VIDEO_SIZE) {
    message = "The promotional video must not exceed 5 MB.";
  }

  if (promoVideoError) {
    promoVideoError.textContent = message;
  }

  if (message) {
    return false;
  }

  eventForm.promoVideo = file;

  return true;
};

/* =========================================================
   PROMOTIONAL VIDEO PREVIEW
========================================================= */

const displayPromoVideo = (file) => {
  revokePromoVideoPreviewUrl();

  promoVideoPreviewUrl = URL.createObjectURL(file);

  if (promoPreview) {
    promoPreview.pause();

    promoPreview.src = promoVideoPreviewUrl;
    promoPreview.hidden = false;

    promoPreview.load();
  }

  if (promoPreviewWrapper) {
    promoPreviewWrapper.hidden = false;
  }

  if (promoFileName) {
    promoFileName.textContent = `${file.name} (${formatFileSize(file.size)})`;
  }

  if (removePromoVideoBtn) {
    removePromoVideoBtn.hidden = false;
  }

  if (promoVideoError) {
    promoVideoError.textContent = "";
  }

  eventForm.promoVideo = file;
};

const handlePromoVideoChange = () => {
  if (!promoVideoInput) {
    return;
  }

  const file = promoVideoInput.files?.[0];

  if (!file) {
    return;
  }

  if (!validatePromoVideo()) {
    /*
     * Invalid file selected:
     * clear the file and preview.
     */

    removePromoVideo();

    return;
  }

  displayPromoVideo(file);
};

const removePromoVideo = () => {
  if (promoPreview) {
    promoPreview.pause();

    promoPreview.removeAttribute("src");

    promoPreview.load();

    promoPreview.hidden = true;
  }

  revokePromoVideoPreviewUrl();

  if (promoVideoInput) {
    promoVideoInput.value = "";
  }

  if (promoFileName) {
    promoFileName.textContent = "No video selected";
  }

  if (promoVideoError) {
    promoVideoError.textContent = "";
  }

  if (removePromoVideoBtn) {
    removePromoVideoBtn.hidden = true;
  }

  if (promoPreviewWrapper) {
    promoPreviewWrapper.hidden = true;
  }

  eventForm.promoVideo = null;
};

/* =========================================================
   STEP 1 VALIDATION
========================================================= */

const validateStepOne = () => {
  const eventNameValid = validateEventName();

  const categoryValid = validateCategory();

  const descriptionValid = validateDescription();

  const bannerValid = validateBanner({
    required: true,
  });

  const promoVideoValid = validatePromoVideo();

  return (
    eventNameValid &&
    categoryValid &&
    descriptionValid &&
    bannerValid &&
    promoVideoValid
  );
};

/* =========================================================
   CHARACTER COUNTERS
========================================================= */

const updateEventNameCount = () => {
  const counter = getElement("eventNameCount");

  if (counter && eventNameInput) {
    counter.textContent = `${eventNameInput.value.length} / 100`;
  }
};

const updateDescriptionCount = () => {
  const counter = getElement("descriptionCount");

  if (counter && descriptionInput) {
    counter.textContent = `${descriptionInput.value.length} / 2000`;
  }
};

/* =========================================================
   LOCATION AND SCHEDULE VALIDATION
========================================================= */

const validateLocation = () => {
  let valid = true;

  const fields = [
    ["venue", "Venue is required."],
    ["address", "Address is required."],
    ["city", "City is required."],
    ["state", "State is required."],
    ["pincode", "Pincode is required."],
  ];

  const locationValues = {};

  fields.forEach(([id, message]) => {
    const input = getElement(id);
    const error = getElement(`${id}Error`);

    if (!input) {
      valid = false;

      return;
    }

    const value = input.value.trim();

    locationValues[id] = value;

    const fieldMessage = value ? "" : message;

    setFieldError(input, error, fieldMessage);

    if (fieldMessage) {
      valid = false;
    }
  });

  const pincodeInput = getElement("pincode");

  if (pincodeInput && pincodeInput.value.trim()) {
    const pincode = pincodeInput.value.trim();

    if (!/^\d{6}$/.test(pincode)) {
      setFieldError(
        pincodeInput,
        getElement("pincodeError"),
        "Pincode must contain exactly 6 digits.",
      );

      valid = false;
    }
  }

  const eventDateInput = getElement("eventDate");
  const startTimeInput = getElement("startTime");
  const endTimeInput = getElement("endTime");

  const eventDate = eventDateInput?.value || "";
  const startTime = startTimeInput?.value || "";
  const endTime = endTimeInput?.value || "";

  const today = getTodayDate();

  if (!eventDate) {
    setFieldError(
      eventDateInput,
      getElement("eventDateError"),
      "Event date is required.",
    );

    valid = false;
  } else if (eventDate < today) {
    setFieldError(
      eventDateInput,
      getElement("eventDateError"),
      "Event date cannot be in the past.",
    );

    valid = false;
  } else {
    setFieldError(eventDateInput, getElement("eventDateError"), "");
  }

  if (!startTime) {
    setFieldError(
      startTimeInput,
      getElement("startTimeError"),
      "Start time is required.",
    );

    valid = false;
  } else {
    setFieldError(startTimeInput, getElement("startTimeError"), "");
  }

  if (!endTime) {
    setFieldError(
      endTimeInput,
      getElement("endTimeError"),
      "End time is required.",
    );

    valid = false;
  } else {
    setFieldError(endTimeInput, getElement("endTimeError"), "");
  }

  if (startTime && endTime && startTime >= endTime) {
    setFieldError(
      endTimeInput,
      getElement("endTimeError"),
      "End time must be after start time.",
    );

    valid = false;
  }

  if (!valid) {
    return false;
  }

  eventForm.location.venue = locationValues.venue;
  eventForm.location.address = locationValues.address;
  eventForm.location.city = locationValues.city;
  eventForm.location.state = locationValues.state;
  eventForm.location.pincode = locationValues.pincode;

  eventForm.eventDate = eventDate;
  eventForm.startTime = startTime;
  eventForm.endTime = endTime;

  return true;
};

/* =========================================================
   TICKETS
========================================================= */

const updateTicket = (ticketId, field, value) => {
  const ticket = eventForm.tickets.find((item) => item.id === ticketId);

  if (!ticket) {
    return;
  }

  if (field === "name") {
    ticket.name = value;
  }

  if (field === "price") {
    ticket.price = value === "" ? NaN : Number(value);
  }

  if (field === "quantity") {
    ticket.quantity = value === "" ? NaN : Number(value);
  }
};

const addTicket = () => {
  if (!ticketsContainer) {
    return;
  }

  eventForm.tickets.push({
    id: crypto.randomUUID(),
    name: "",
    price: NaN,
    quantity: NaN,
  });

  renderTickets();
};

const removeTicket = (ticketId) => {
  eventForm.tickets = eventForm.tickets.filter(
    (ticket) => ticket.id !== ticketId,
  );

  renderTickets();
};

/*
 * Build ticket cards using DOM APIs instead of inserting
 * user-controlled ticket names into innerHTML.
 */

const renderTickets = () => {
  if (!ticketsContainer) {
    return;
  }

  ticketsContainer.replaceChildren();

  if (!eventForm.tickets.length) {
    if (noTicketsMessage) {
      noTicketsMessage.style.display = "flex";
    }

    return;
  }

  if (noTicketsMessage) {
    noTicketsMessage.style.display = "none";
  }

  eventForm.tickets.forEach((ticket, index) => {
    const card = document.createElement("div");

    card.className = "ticket-card";

    const header = document.createElement("div");

    header.className = "ticket-card-header";

    const title = document.createElement("h4");

    title.textContent = `Ticket ${index + 1}`;

    const removeButton = document.createElement("button");

    removeButton.type = "button";
    removeButton.className = "remove-ticket-btn";
    removeButton.textContent = "Remove";

    removeButton.addEventListener("click", () => {
      removeTicket(ticket.id);
    });

    header.append(title, removeButton);

    const fields = document.createElement("div");

    fields.className = "ticket-fields";

    const nameField = createTicketField({
      label: "Ticket Name",
      type: "text",
      className: "ticket-name",
      value: ticket.name,
      placeholder: "e.g. Gold",
      ticketId: ticket.id,
      field: "name",
    });

    const priceField = createTicketField({
      label: "Price (₹)",
      type: "number",
      className: "ticket-price",
      value: Number.isFinite(ticket.price) ? ticket.price : "",
      placeholder: "500",
      min: "0.01",
      step: "0.01",
      ticketId: ticket.id,
      field: "price",
    });

    const quantityField = createTicketField({
      label: "Quantity",
      type: "number",
      className: "ticket-quantity",
      value: Number.isFinite(ticket.quantity) ? ticket.quantity : "",
      placeholder: "100",
      min: "1",
      step: "1",
      ticketId: ticket.id,
      field: "quantity",
    });

    fields.append(nameField, priceField, quantityField);

    card.append(header, fields);

    ticketsContainer.appendChild(card);
  });
};

const createTicketField = ({
  label,
  type,
  className,
  value,
  placeholder,
  min,
  step,
  ticketId,
  field,
}) => {
  const wrapper = document.createElement("div");

  wrapper.className = "ticket-field";

  const labelElement = document.createElement("label");

  labelElement.textContent = label;

  const input = document.createElement("input");

  input.type = type;
  input.className = className;
  input.value = value;
  input.placeholder = placeholder;

  input.dataset.ticketId = ticketId;

  if (min !== undefined) {
    input.min = min;
  }

  if (step !== undefined) {
    input.step = step;
  }

  input.addEventListener("input", () => {
    updateTicket(ticketId, field, input.value);
  });

  wrapper.append(labelElement, input);

  return wrapper;
};

const validateTickets = ({ allowIncomplete = false } = {}) => {
  if (!eventForm.tickets.length) {
    if (allowIncomplete) {
      return true;
    }

    showMessage("Please add at least one ticket type.", "warning");

    return false;
  }

  const names = new Set();

  for (const ticket of eventForm.tickets) {
    const name = ticket.name.trim();

    const price = ticket.price;
    const quantity = ticket.quantity;

    /*
     * Drafts can contain incomplete ticket fields.
     * Fully supplied ticket fields must still be valid.
     */

    const ticketIsIncomplete =
      !name || !Number.isFinite(price) || !Number.isFinite(quantity);

    if (allowIncomplete && ticketIsIncomplete) {
      continue;
    }

    if (!name) {
      showMessage("Every ticket must have a name.", "warning");

      return false;
    }

    const normalizedName = name.toLowerCase();

    if (names.has(normalizedName)) {
      showMessage("Ticket names must be unique.", "warning");

      return false;
    }

    names.add(normalizedName);

    if (!Number.isFinite(price) || price <= 0) {
      showMessage("Ticket price must be greater than zero.", "warning");

      return false;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      showMessage(
        "Ticket quantity must be a positive whole number.",
        "warning",
      );

      return false;
    }
  }

  return true;
};

/* =========================================================
   BOOKING POLICY
========================================================= */

const collectBookingPolicy = () => {
  const input = getElement("allowAfterStart");

  eventForm.bookingPolicy.allowAfterStart = input ? input.checked : false;

  return true;
};

/* =========================================================
   REVIEW HELPERS
========================================================= */

const getCategoryName = () => {
  if (!categoryInput) {
    return "";
  }

  return categoryInput.options[categoryInput.selectedIndex]?.text || "";
};

const escapeHtml = (value) => {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const replacements = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return replacements[character];
  });
};

/* =========================================================
   REVIEW
========================================================= */

const renderReview = () => {
  if (!reviewContainer) {
    return;
  }

  const ticketRows = eventForm.tickets
    .map(
      (ticket) => `
        <div class="review-item">
          <span>${escapeHtml(ticket.name || "Unnamed ticket")}</span>

          <strong>
            ₹${escapeHtml(
              Number.isFinite(ticket.price) ? ticket.price : "Not set",
            )}
            ×
            ${escapeHtml(
              Number.isFinite(ticket.quantity) ? ticket.quantity : "Not set",
            )}
          </strong>
        </div>
      `,
    )
    .join("");

  const bannerHtml =
    eventForm.banner && bannerPreviewUrl
      ? `
        <div class="review-section">
          <h3>Event Banner</h3>

          <img
            src="${bannerPreviewUrl}"
            class="review-banner"
            alt="Event banner"
          >
        </div>
      `
      : `
        <div class="review-section">
          <h3>Event Banner</h3>
          <p>No banner selected.</p>
        </div>
      `;

  const promoVideoHtml =
    eventForm.promoVideo && promoVideoPreviewUrl
      ? `
        <div class="review-section">
          <h3>Promotional Video</h3>

          <video
            src="${promoVideoPreviewUrl}"
            controls
            playsinline
            preload="metadata"
            style="width:100%;max-width:500px;border-radius:12px;"
          ></video>

          <p>${escapeHtml(eventForm.promoVideo.name)}</p>
        </div>
      `
      : `
        <div class="review-section">
          <h3>Promotional Video</h3>
          <p>No promotional video added.</p>
        </div>
      `;

  reviewContainer.innerHTML = `
    <div class="review-section">
      <h3>Basic Information</h3>

      <div class="review-grid">
        <div class="review-item">
          <span>Event Name</span>
          <strong>${escapeHtml(eventForm.eventName)}</strong>
        </div>

        <div class="review-item">
          <span>Category</span>
          <strong>${escapeHtml(getCategoryName())}</strong>
        </div>

        <div class="review-item">
          <span>Description</span>
          <strong>${escapeHtml(eventForm.description)}</strong>
        </div>
      </div>
    </div>

    ${bannerHtml}
    ${promoVideoHtml}

    <div class="review-section">
      <h3>Location & Schedule</h3>

      <div class="review-grid">
        <div class="review-item">
          <span>Venue</span>
          <strong>${escapeHtml(eventForm.location.venue)}</strong>
        </div>

        <div class="review-item">
          <span>City</span>
          <strong>${escapeHtml(eventForm.location.city)}</strong>
        </div>

        <div class="review-item">
          <span>Address</span>
          <strong>${escapeHtml(eventForm.location.address)}</strong>
        </div>

        <div class="review-item">
          <span>State</span>
          <strong>${escapeHtml(eventForm.location.state)}</strong>
        </div>

        <div class="review-item">
          <span>Pincode</span>
          <strong>${escapeHtml(eventForm.location.pincode)}</strong>
        </div>

        <div class="review-item">
          <span>Date</span>
          <strong>${escapeHtml(eventForm.eventDate)}</strong>
        </div>

        <div class="review-item">
          <span>Time</span>

          <strong>
            ${escapeHtml(eventForm.startTime)}
            -
            ${escapeHtml(eventForm.endTime)}
          </strong>
        </div>
      </div>
    </div>

    <div class="review-section">
      <h3>Tickets</h3>

      <div class="review-grid">
        ${ticketRows || "<p>No ticket types added.</p>"}
      </div>
    </div>

    <div class="review-section">
      <h3>Booking Settings</h3>

      <div class="review-item">
        <span>Booking after event starts</span>

        <strong>
          ${eventForm.bookingPolicy.allowAfterStart ? "Allowed" : "Not allowed"}
        </strong>
      </div>
    </div>
  `;
};

/* =========================================================
   FORM DATA
========================================================= */

const createFormData = (status = "pending") => {
  const formData = new FormData();

  formData.append("eventName", eventForm.eventName);

  formData.append("description", eventForm.description);

  formData.append("category", eventForm.category);

  if (eventForm.banner) {
    formData.append("banner", eventForm.banner);
  }

  if (eventForm.promoVideo) {
    formData.append("promoVideo", eventForm.promoVideo);
  }

  formData.append("location", JSON.stringify(eventForm.location));

  formData.append("eventDate", eventForm.eventDate);

  formData.append("startTime", eventForm.startTime);

  formData.append("endTime", eventForm.endTime);

  const tickets = eventForm.tickets.map(({ name, price, quantity }) => ({
    name: name.trim(),
    price: Number.isFinite(price) ? price : null,
    quantity: Number.isFinite(quantity) ? quantity : null,
  }));

  formData.append("tickets", JSON.stringify(tickets));

  formData.append("bookingPolicy", JSON.stringify(eventForm.bookingPolicy));

  formData.append("status", status);

  return formData;
};

/* =========================================================
   SUBMISSION VALIDATION
========================================================= */

const validateAllSteps = () => {
  if (!validateStepOne()) {
    showStep(1);

    showMessage("Please complete the basic information.", "warning");

    return false;
  }

  if (!validateLocation()) {
    showStep(2);

    showMessage("Please complete the location and schedule.", "warning");

    return false;
  }

  if (!validateTickets()) {
    showStep(3);

    return false;
  }

  collectBookingPolicy();

  return true;
};

/* =========================================================
   SUBMIT EVENT
========================================================= */

const submitEvent = async () => {
  if (isSubmitting || isSavingDraft) {
    return;
  }

  if (!validateAllSteps()) {
    return;
  }

  isSubmitting = true;

  try {
    nextBtn.disabled = true;
    previousBtn.disabled = true;
    saveDraftBtn.disabled = true;

    nextBtn.textContent = "Submitting...";

    const formData = createFormData("pending");

    const response = await authenticatedFetch("/api/host/events", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to create event.");
    }

    await Swal.fire({
      icon: "success",
      title: "Event submitted",
      text: result.message || "Your event has been submitted for approval.",
      confirmButtonText: "Continue",
    });

    window.location.href = "/host/events";
  } catch (error) {
    console.error("Event creation error:", error);

    if (
      error.message !== "Authentication token not found." &&
      error.message !== "Authentication failed."
    ) {
      await showMessage(error.message || "Unable to create event.", "error");
    }
  } finally {
    isSubmitting = false;

    nextBtn.disabled = false;

    previousBtn.disabled = currentStep === 1;

    saveDraftBtn.disabled = false;

    nextBtn.textContent = currentStep === 5 ? "Submit Event" : "Continue →";
  }
};

/* =========================================================
   NEXT STEP
========================================================= */

const handleNext = async () => {
  if (isSubmitting || isSavingDraft) {
    return;
  }

  if (currentStep === 1 && !validateStepOne()) {
    await showMessage(
      "Please complete all required fields and check the promotional video.",
      "warning",
    );

    return;
  }

  if (currentStep === 2 && !validateLocation()) {
    await showMessage("Please complete the location and schedule.", "warning");

    return;
  }

  if (currentStep === 3 && !validateTickets()) {
    return;
  }

  if (currentStep === 4) {
    collectBookingPolicy();
  }

  if (currentStep === 5) {
    await submitEvent();

    return;
  }

  showStep(currentStep + 1);
};

const handlePrevious = () => {
  if (currentStep > 1 && !isSubmitting && !isSavingDraft) {
    showStep(currentStep - 1);
  }
};

/* =========================================================
   SAVE DRAFT
========================================================= */

const handleSaveDraft = async () => {
  if (isSavingDraft || isSubmitting) {
    return;
  }

  /*
   * Validate supplied files, but don't require the banner
   * or other event fields to be completed.
   */

  if (
    bannerInput.files?.length &&
    !validateBanner({
      required: false,
    })
  ) {
    showStep(1);

    await showMessage("Please select a valid banner image.", "warning");

    return;
  }

  if (!validatePromoVideo()) {
    showStep(1);

    await showMessage("Please select a valid promotional video.", "warning");

    return;
  }

  /*
   * A partially completed ticket must be completed before
   * saving, or all its fields should be left empty.
   */

  for (const ticket of eventForm.tickets) {
    const name = ticket.name.trim();

    const hasName = Boolean(name);
    const hasPrice = Number.isFinite(ticket.price);
    const hasQuantity = Number.isFinite(ticket.quantity);

    const hasAnyValue = hasName || hasPrice || hasQuantity;

    const hasAllValues = hasName && hasPrice && hasQuantity;

    if (hasAnyValue && !hasAllValues) {
      showStep(3);

      await showMessage(
        "Complete each ticket's name, price, and quantity, or remove the incomplete ticket before saving the draft.",
        "warning",
      );

      return;
    }
  }

  if (
    eventForm.tickets.some(
      (ticket) =>
        ticket.name.trim() &&
        (ticket.price <= 0 ||
          !Number.isFinite(ticket.price) ||
          !Number.isInteger(ticket.quantity) ||
          ticket.quantity <= 0),
    )
  ) {
    showStep(3);

    await showMessage(
      "Please check the price and quantity of your tickets.",
      "warning",
    );

    return;
  }

  const confirmed = await Swal.fire({
    icon: "question",
    title: "Save as draft?",
    text: "Your event will be saved so you can continue editing it later.",
    showCancelButton: true,
    confirmButtonText: "Save Draft",
    cancelButtonText: "Cancel",
  });

  if (!confirmed.isConfirmed) {
    return;
  }

  isSavingDraft = true;

  try {
    saveDraftBtn.disabled = true;
    nextBtn.disabled = true;
    previousBtn.disabled = true;

    saveDraftBtn.textContent = "Saving...";

    /*
     * Save whatever information has been entered.
     * Required-field validation is intentionally skipped.
     */

    if (eventNameInput) {
      eventForm.eventName = eventNameInput.value.trim();
    }

    if (descriptionInput) {
      eventForm.description = descriptionInput.value.trim();
    }

    if (categoryInput) {
      eventForm.category = categoryInput.value;
    }

    const locationFields = ["venue", "address", "city", "state", "pincode"];

    locationFields.forEach((field) => {
      const input = getElement(field);

      eventForm.location[field] = input ? input.value.trim() : "";
    });

    eventForm.eventDate = getElement("eventDate")?.value || "";

    eventForm.startTime = getElement("startTime")?.value || "";

    eventForm.endTime = getElement("endTime")?.value || "";

    collectBookingPolicy();

    const formData = createFormData("draft");

    const response = await authenticatedFetch("/api/host/events", {
      method: "POST",
      body: formData,
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Unable to save draft.");
    }

    await Swal.fire({
      icon: "success",
      title: "Draft saved",
      text: result.message || "Your event has been saved as a draft.",
      confirmButtonText: "OK",
    });
  } catch (error) {
    console.error("Draft error:", error);

    if (
      error.message !== "Authentication token not found." &&
      error.message !== "Authentication failed."
    ) {
      await showMessage(error.message || "Unable to save draft.", "error");
    }
  } finally {
    isSavingDraft = false;

    saveDraftBtn.disabled = false;
    nextBtn.disabled = false;

    previousBtn.disabled = currentStep === 1;

    saveDraftBtn.textContent = "Save Draft";
  }
};

/* =========================================================
   CANCEL
========================================================= */

const handleCancel = async () => {
  if (isSubmitting || isSavingDraft) {
    return;
  }

  const result = await Swal.fire({
    icon: "warning",
    title: "Cancel event creation?",
    text: "Your unsaved changes will be lost.",
    showCancelButton: true,
    confirmButtonText: "Yes, cancel",
    cancelButtonText: "Continue editing",
  });

  if (!result.isConfirmed) {
    return;
  }

  window.location.href = "/host/events";
};

/* =========================================================
   BANNER DRAG AND DROP
========================================================= */

const handleDragOver = (event) => {
  event.preventDefault();

  if (uploadArea) {
    uploadArea.classList.add("drag-over");
  }
};

const handleDragLeave = () => {
  if (uploadArea) {
    uploadArea.classList.remove("drag-over");
  }
};

const handleDrop = (event) => {
  event.preventDefault();

  if (uploadArea) {
    uploadArea.classList.remove("drag-over");
  }

  const file = event.dataTransfer?.files?.[0];

  if (!file || !bannerInput) {
    return;
  }

  const dataTransfer = new DataTransfer();

  dataTransfer.items.add(file);

  bannerInput.files = dataTransfer.files;

  handleBannerChange();
};

/* =========================================================
   DATE HELPERS
========================================================= */

const getTodayDate = () => {
  const date = new Date();

  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");

  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

/* =========================================================
   EVENT LISTENERS
========================================================= */

if (eventNameInput) {
  eventNameInput.addEventListener("input", updateEventNameCount);
}

if (descriptionInput) {
  descriptionInput.addEventListener("input", updateDescriptionCount);
}

if (bannerInput) {
  bannerInput.addEventListener("change", handleBannerChange);
}

if (browseBannerBtn && bannerInput) {
  browseBannerBtn.addEventListener("click", () => {
    bannerInput.click();
  });
}

if (removeBannerBtn) {
  removeBannerBtn.addEventListener("click", removeBanner);
}

if (promoVideoInput) {
  promoVideoInput.addEventListener("change", handlePromoVideoChange);
}

if (browsePromoVideoBtn && promoVideoInput) {
  browsePromoVideoBtn.addEventListener("click", () => {
    promoVideoInput.click();
  });
}

if (removePromoVideoBtn) {
  removePromoVideoBtn.addEventListener("click", removePromoVideo);
}

if (uploadArea) {
  uploadArea.addEventListener("dragover", handleDragOver);

  uploadArea.addEventListener("dragleave", handleDragLeave);

  uploadArea.addEventListener("drop", handleDrop);
}

if (addTicketBtn) {
  addTicketBtn.addEventListener("click", addTicket);
}

if (nextBtn) {
  nextBtn.addEventListener("click", handleNext);
}

if (previousBtn) {
  previousBtn.addEventListener("click", handlePrevious);
}

if (saveDraftBtn) {
  saveDraftBtn.addEventListener("click", handleSaveDraft);
}

if (cancelEventBtn) {
  cancelEventBtn.addEventListener("click", handleCancel);
}

/* =========================================================
   INITIALIZATION
========================================================= */

const initializeCreateEventPage = () => {
  const eventDateInput = getElement("eventDate");

  if (eventDateInput) {
    eventDateInput.min = getTodayDate();
  }

  showStep(1);

  updateEventNameCount();
  updateDescriptionCount();

  renderTickets();

  loadCategories();
};

initializeCreateEventPage();

/*
 * Clean up local preview URLs when leaving the page.
 */

window.addEventListener("pagehide", () => {
  revokeBannerPreviewUrl();
  revokePromoVideoPreviewUrl();
});
