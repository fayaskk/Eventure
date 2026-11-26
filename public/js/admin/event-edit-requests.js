const requestsContainer = document.getElementById("edit-requests-container");
const requestCount = document.getElementById("request-count");
const refreshButton = document.getElementById("refresh-requests-btn");
const detailsContainer = document.getElementById("request-details");

let selectedEvent = null;
let isProcessingRequest = false;

const getAuthToken = () =>
  localStorage.getItem("token") || sessionStorage.getItem("token");

const createElement = (tag, text = null, ...classNames) => {
  const element = document.createElement(tag);

  if (text !== null && text !== undefined) {
    element.textContent = text;
  }

  if (classNames.length) {
    element.classList.add(...classNames);
  }

  return element;
};

const getCategoryName = (category) => {
  if (category && typeof category === "object") {
    return category.name || "Uncategorized";
  }

  return category || "Uncategorized";
};

const formatDate = (date) => {
  if (!date) return "Not provided";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not provided";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "Not provided";
  }

  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
};

const createComparisonField = (label, value) => {
  const field = createElement("div", null, "comparison-field");

  field.append(
    createElement("span", label),
    createElement("p", formatValue(value)),
  );

  return field;
};

const createMediaCard = (label, mediaUrl, type, altText, emptyMessage) => {
  const card = createElement("div", null, "media-card");

  card.append(createElement("h4", label));

  if (!mediaUrl) {
    const emptyState = createElement("div", null, "media-empty");
    emptyState.append(createElement("p", emptyMessage));
    card.append(emptyState);

    return card;
  }

  const media = createElement(type);

  if (type === "img") {
    media.classList.add("banner-preview");
    media.src = mediaUrl;
    media.alt = altText;
    media.loading = "lazy";

    media.addEventListener("error", () => {
      media.replaceWith(
        createElement("p", "Unable to load this image.", "media-error"),
      );
    });
  } else {
    media.classList.add("video-preview");
    media.src = mediaUrl;
    media.controls = true;
    media.preload = "metadata";
    media.setAttribute("aria-label", label);
  }

  card.append(media);

  return card;
};

const createSectionHeading = (title, description) => {
  const heading = createElement("div", null, "section-title-row");

  heading.append(createElement("h3", title), createElement("p", description));

  return heading;
};

const createDetailSection = (title, description, type) => {
  const section = createElement("section", null, "detail-section", type);

  section.append(createSectionHeading(title, description));

  return section;
};

const createEventInformationGrid = (event) => {
  const grid = createElement("div", null, "comparison-grid");

  grid.append(
    createComparisonField("Event name", event.eventName),
    createComparisonField("Description", event.description),
    createComparisonField("Category", getCategoryName(event.category)),
    createComparisonField("Venue", event.location?.venue),
    createComparisonField("Address", event.location?.address),
    createComparisonField("City", event.location?.city),
    createComparisonField("State", event.location?.state),
    createComparisonField("Pincode", event.location?.pincode),
    createComparisonField("Event date", formatDate(event.eventDate)),
    createComparisonField("Start time", event.startTime),
    createComparisonField("End time", event.endTime),
    createComparisonField(
      "Allow booking after start",
      event.bookingPolicy?.allowAfterStart,
    ),
  );

  return grid;
};

const createEventMedia = (event) => {
  const mediaGrid = createElement("div", null, "banner-comparison");

  mediaGrid.append(
    createMediaCard(
      "Event banner",
      event.banner,
      "img",
      "Event banner",
      "No event banner available.",
    ),
    createMediaCard(
      "Promotional video",
      event.promoVideo,
      "video",
      "Promotional video",
      "No promotional video available.",
    ),
  );

  return mediaGrid;
};

const createTicketSection = (
  tickets = [],
  title = "Event Tickets",
  description = "Ticket types and their availability.",
) => {
  const section = createElement(
    "section",
    null,
    "detail-section",
    "ticket-section",
  );

  section.append(createSectionHeading(title, description));

  if (!Array.isArray(tickets) || tickets.length === 0) {
    section.append(
      createElement("p", "No ticket information available.", "empty-state"),
    );

    return section;
  }

  const ticketGrid = createElement("div", null, "ticket-comparison");

  tickets.forEach((ticket) => {
    const card = createElement("article", null, "ticket-card");

    card.append(
      createComparisonField("Ticket name", ticket.name),
      createComparisonField(
        "Price",
        ticket.price !== null && ticket.price !== undefined
          ? `₹${ticket.price}`
          : "Not provided",
      ),
      createComparisonField("Quantity", ticket.quantity),
      createComparisonField("Reserved", ticket.reserved ?? 0),
      createComparisonField("Sold", ticket.sold ?? 0),
    );

    ticketGrid.append(card);
  });

  section.append(ticketGrid);

  return section;
};

const createEventPanel = (event, title, description, sectionClass) => {
  const section = createDetailSection(title, description, sectionClass);

  section.append(
    createEventInformationGrid(event),
    createEventMedia(event),
    createTicketSection(event.tickets || []),
  );

  return section;
};

const getRequestStatusMessage = (status) => {
  const messages = {
    editing: "The host has permission to edit this event.",
    rejected:
      "The edit request was rejected. The host may correct and resubmit the changes.",
    none: "There is no active edit request for this event.",
  };

  return (
    messages[status] ||
    "This request is not currently awaiting an admin decision."
  );
};

const createReviewActions = (event) => {
  const actions = createElement("div", null, "review-actions");
  const status = String(event.editRequestStatus || "").toLowerCase();

  const isPermissionRequest = status === "pending";
  const isChangesRequest = status === "review";

  if (!isPermissionRequest && !isChangesRequest) {
    actions.append(
      createElement(
        "p",
        getRequestStatusMessage(status),
        "review-status-message",
      ),
    );

    return actions;
  }

  const approveButton = createElement(
    "button",
    null,
    "review-action-btn",
    "approve-btn",
  );

  const rejectButton = createElement(
    "button",
    null,
    "review-action-btn",
    "reject-btn",
  );

  approveButton.type = "button";
  rejectButton.type = "button";

  approveButton.innerHTML = isPermissionRequest
    ? '<i class="bi bi-check-circle"></i> Approve Edit Permission'
    : '<i class="bi bi-check-circle"></i> Approve Changes';

  rejectButton.innerHTML = isPermissionRequest
    ? '<i class="bi bi-x-circle"></i> Reject Edit Permission'
    : '<i class="bi bi-x-circle"></i> Reject Changes';

  approveButton.addEventListener("click", () => {
    processEditRequest(event, "approve");
  });

  rejectButton.addEventListener("click", () => {
    processEditRequest(event, "reject");
  });

  actions.append(approveButton, rejectButton);

  return actions;
};

const renderRequestDetails = (event) => {
  detailsContainer.replaceChildren();

  const heading = createElement("header", null, "detail-heading");
  const headingContent = createElement("div");

  const status = String(event.editRequestStatus || "unknown").toLowerCase();

  const statusDescriptions = {
    pending: "The host is requesting permission to edit this event.",
    editing: "The host has permission to edit this event.",
    review: "The host has submitted event changes for admin approval.",
    rejected: "This edit request was rejected.",
    none: "There is no active edit request.",
  };

  headingContent.append(
    createElement("p", "EVENT EDIT REQUEST", "section-label"),
    createElement("h2", event.eventName || "Untitled event"),
    createElement(
      "p",
      `Host: ${event.host?.name || "Unknown host"} · Request status: ${status}`,
      "detail-subtitle",
    ),
    createElement(
      "p",
      statusDescriptions[status] || "Review the event details below.",
      "request-description",
    ),
  );

  heading.append(headingContent);

  const comparisonLayout = createElement("div", null, "comparison-layout");

  const currentSection = createEventPanel(
    event,
    "Current Event",
    "The event's currently approved information.",
    "current-section",
  );

  comparisonLayout.append(currentSection);

  if (status === "review" && event.pendingEdit) {
    const proposedEvent = {
      ...event,
      ...event.pendingEdit,
      _id: event._id,
      host: event.host,
      category: event.pendingEdit.category || event.category,
      location: {
        ...(event.location || {}),
        ...(event.pendingEdit.location || {}),
      },
      bookingPolicy: {
        ...(event.bookingPolicy || {}),
        ...(event.pendingEdit.bookingPolicy || {}),
      },
      tickets: Array.isArray(event.pendingEdit.tickets)
        ? event.pendingEdit.tickets
        : event.tickets || [],
    };

    const proposedSection = createEventPanel(
      proposedEvent,
      "Proposed Changes",
      "The updated information submitted by the host.",
      "proposed-section",
    );

    comparisonLayout.append(proposedSection);
  }

  detailsContainer.append(
    heading,
    comparisonLayout,
    createReviewActions(event),
  );
};

const renderEmptyDetails = (
  message = "Select a request from the list to review its details.",
  title = "Select an edit request",
) => {
  detailsContainer.replaceChildren();

  const placeholder = createElement("div", null, "details-placeholder");
  const icon = createElement("div", "☷", "placeholder-icon");
  const heading = createElement("h2", title);
  const description = createElement("p", message);

  placeholder.append(icon, heading, description);
  detailsContainer.append(placeholder);
};

const renderRequestList = (events) => {
  requestsContainer.replaceChildren();

  if (events.length === 0) {
    requestsContainer.append(
      createElement("p", "No edit requests available.", "empty-state"),
    );

    selectedEvent = null;

    renderEmptyDetails(
      "There are no event edit requests waiting for review.",
      "No pending requests",
    );

    return;
  }

  const previousSelectedId = selectedEvent?._id;

  events.forEach((event) => {
    const card = createElement("button", null, "request-item");

    card.type = "button";
    card.dataset.eventId = String(event._id);

    card.append(
      createElement(
        "span",
        event.eventName || "Untitled event",
        "request-item-title",
      ),
      createElement(
        "span",
        `Host: ${event.host?.name || "Unknown host"}`,
        "request-item-host",
      ),
      createElement(
        "span",
        `Category: ${getCategoryName(event.category)}`,
        "request-item-host",
      ),
      createElement(
        "span",
        `Status: ${event.editRequestStatus || "Unknown"}`,
        "request-item-status",
      ),
    );

    card.addEventListener("click", () => {
      selectRequest(event);
    });

    requestsContainer.append(card);
  });

  const eventToSelect =
    events.find((event) => String(event._id) === String(previousSelectedId)) ||
    events[0];

  selectRequest(eventToSelect);
};

const selectRequest = (event) => {
  selectedEvent = event;

  requestsContainer.querySelectorAll(".request-item").forEach((item) => {
    const isActive = item.dataset.eventId === String(event._id);

    item.classList.toggle("is-active", isActive);
    item.setAttribute("aria-pressed", String(isActive));
  });

  renderRequestDetails(event);
};

const getRejectionReason = async (isPermissionRequest) => {
  const title = isPermissionRequest
    ? "Reject Edit Permission"
    : "Reject Proposed Changes";

  const description = isPermissionRequest
    ? "Explain why the host cannot edit this event."
    : "Explain why the host's submitted changes cannot be approved.";

  const confirmText = isPermissionRequest
    ? "Reject Permission"
    : "Reject Changes";

  const result = await Swal.fire({
    title,
    text: description,
    input: "textarea",
    inputLabel: "Rejection reason",
    inputPlaceholder: "Explain the reason for rejection...",
    inputAttributes: {
      "aria-label": "Rejection reason",
      maxlength: 1000,
    },
    inputValidator: (value) => {
      if (!value || !value.trim()) {
        return "A rejection reason is required.";
      }

      if (value.trim().length < 5) {
        return "Please provide a reason with at least 5 characters.";
      }

      return undefined;
    },
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: "Cancel",
    reverseButtons: true,
    focusCancel: true,
  });

  if (!result.isConfirmed) {
    return null;
  }

  return result.value.trim();
};

const processEditRequest = async (event, action) => {
  if (isProcessingRequest) return;

  const token = getAuthToken();

  if (!token) {
    window.location.replace("/admin/login");
    return;
  }

  const eventId = event._id;
  const status = String(event.editRequestStatus || "").toLowerCase();

  const isPermissionRequest = status === "pending";
  const isChangesRequest = status === "review";

  if (!isPermissionRequest && !isChangesRequest) {
    await Swal.fire({
      title: "Request unavailable",
      text: "This request is no longer awaiting review.",
      icon: "info",
    });

    await loadRequests();
    return;
  }

  const isApprove = action === "approve";
  let rejectionReason = "";

  if (isApprove) {
    const confirmation = await Swal.fire({
      title: isPermissionRequest
        ? "Approve edit permission?"
        : "Approve event changes?",
      text: isPermissionRequest
        ? "The host will be allowed to edit this approved event."
        : "The host's submitted changes will be applied to this event.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: isPermissionRequest
        ? "Yes, allow editing"
        : "Yes, approve changes",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) return;
  } else {
    rejectionReason = await getRejectionReason(isPermissionRequest);

    if (!rejectionReason) return;
  }

  isProcessingRequest = true;

  detailsContainer.querySelectorAll(".review-action-btn").forEach((button) => {
    button.disabled = true;
  });

  if (refreshButton) {
    refreshButton.disabled = true;
  }

  try {
    const endpointType = isPermissionRequest ? "edit-request" : "updated";
    const endpointAction = isApprove ? "approve" : "reject";

    const endpoint = `/api/admin/events/${encodeURIComponent(
      eventId,
    )}/${endpointType}/${endpointAction}`;

    const options = {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    };

    if (!isApprove) {
      options.body = JSON.stringify({ rejectionReason });
    }

    const response = await fetch(endpoint, options);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || `Unable to ${action} this event edit request.`,
      );
    }

    await Swal.fire({
      title: isApprove
        ? isPermissionRequest
          ? "Edit permission approved"
          : "Changes approved"
        : isPermissionRequest
          ? "Edit permission rejected"
          : "Changes rejected",
      text:
        result.message ||
        (isApprove
          ? isPermissionRequest
            ? "The host can now edit this event."
            : "The submitted changes have been approved."
          : isPermissionRequest
            ? "The host's edit permission request has been rejected."
            : "The submitted changes have been rejected."),
      icon: "success",
      confirmButtonText: "OK",
    });

    selectedEvent = null;

    await loadRequests();
  } catch (error) {
    console.error(`Error attempting to ${action} edit request:`, error);

    await Swal.fire({
      title: "Action failed",
      text: error.message || "Something went wrong. Please try again.",
      icon: "error",
    });
  } finally {
    isProcessingRequest = false;

    if (refreshButton) {
      refreshButton.disabled = false;
    }

    detailsContainer
      .querySelectorAll(".review-action-btn")
      .forEach((button) => {
        button.disabled = false;
      });
  }
};

const loadRequests = async () => {
  if (refreshButton) {
    refreshButton.disabled = true;
  }

  requestCount.textContent = "Loading edit requests...";

  try {
    const token = getAuthToken();

    if (!token) {
      window.location.replace("/admin/login");
      return;
    }

    const response = await fetch("/api/admin/events/edit-requests/all", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load edit requests.");
    }

    if (!Array.isArray(result.data)) {
      throw new Error("Invalid edit requests response.");
    }

    const events = result.data;

    requestCount.textContent = `${events.length} edit request${
      events.length === 1 ? "" : "s"
    }`;

    renderRequestList(events);
  } catch (error) {
    console.error("Error loading edit requests:", error);

    requestCount.textContent = "Unable to load edit requests";

    requestsContainer.replaceChildren(
      createElement(
        "p",
        error.message || "Something went wrong.",
        "error-state",
      ),
    );

    renderEmptyDetails(
      "An error occurred while loading the request details.",
      "Unable to load requests",
    );
  } finally {
    if (refreshButton && !isProcessingRequest) {
      refreshButton.disabled = false;
    }
  }
};

refreshButton?.addEventListener("click", loadRequests);

loadRequests();