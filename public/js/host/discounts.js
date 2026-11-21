const eventSummary = document.getElementById("event-summary");

const totalCouponsElement = document.getElementById("totalCoupons");
const activeCouponsElement = document.getElementById("activeCoupons");
const expiredCouponsElement = document.getElementById("expiredCoupons");
const totalRedemptionsElement = document.getElementById("totalRedemptions");

const discountList = document.getElementById("discount-list");
const discountSearch = document.getElementById("discountSearch");
const discountStatusFilter = document.getElementById("discountStatusFilter");

const discountModal = document.getElementById("discountModal");
const discountForm = document.getElementById("discountForm");

const addDiscountBtn = document.getElementById("addDiscountBtn");
const closeDiscountModal = document.getElementById("closeDiscountModal");
const cancelDiscountBtn = document.getElementById("cancelDiscountBtn");

const discountTypeInput = document.getElementById("discountType");
const discountValueInput = document.getElementById("discountValue");
const maxDiscountInput = document.getElementById("maxDiscount");
const discountValueSymbol = document.getElementById("discountValueSymbol");

const discountModalTitle = document.getElementById("discountModalTitle");
const submitDiscountBtn = document.getElementById("submitDiscountBtn");
const discountFormError = document.getElementById("discountFormError");

const eventId = window.EVENTURE_EVENT_ID;

let discounts = [];
let currentEditingDiscountId = null;
let currentEvent = null;

const fireAlert = (options = {}) => {
  return Swal.fire({
    ...options,
    didOpen: (popup) => {
      if (typeof options.didOpen === "function") {
        options.didOpen(popup);
      }

      const container = Swal.getContainer();

      if (container) {
        container.style.setProperty("z-index", "3001", "important");
      }
    },
  });
};

const getAuthToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken")
  );
};

const clearAuthTokens = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("accessToken");
};

const authenticatedFetch = async (url, options = {}) => {
  const token = getAuthToken();

  if (!token) {
    await fireAlert({
      icon: "error",
      title: "Authentication required",
      text: "Please login to continue.",
      confirmButtonText: "Login",
    });

    window.location.href = "/login";
    throw new Error("Authentication token not found.");
  }

  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
  };

  if (options.body && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthTokens();

    await fireAlert({
      icon: "error",
      title: "Session expired",
      text: "Please login again.",
    });

    window.location.replace("/login");
    throw new Error("Authentication expired.");
  }

  return response;
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);
};

const formatDate = (date) => {
  if (!date) {
    return "Not available";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Not available";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTimeLocal = (date) => {
  if (!date) {
    return "";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  const offset = parsedDate.getTimezoneOffset() * 60000;

  return new Date(parsedDate.getTime() - offset)
    .toISOString()
    .slice(0, 16);
};

const getDiscountState = (discount) => {
  const now = new Date();
  const startDate = new Date(discount.startDate);
  const endDate = new Date(discount.endDate);

  if (endDate <= now) {
    return "expired";
  }

  if (startDate > now) {
    return "scheduled";
  }

  if (
    discount.usageLimit !== null &&
    discount.usageLimit !== undefined &&
    discount.usedCount >= discount.usageLimit
  ) {
    return "exhausted";
  }

  if (discount.status === "inactive") {
    return "inactive";
  }

  return "active";
};

const getDiscountBadge = (state) => {
  const badges = {
    active: "Active",
    inactive: "Inactive",
    expired: "Expired",
    scheduled: "Scheduled",
    exhausted: "Limit Reached",
  };

  return `
    <span class="discount-status-badge status-${state}">
      ${badges[state] || "Unknown"}
    </span>
  `;
};

const showMessage = (message, icon = "success") => {
  return fireAlert({
    icon,
    title:
      icon === "success"
        ? "Success"
        : icon === "warning"
          ? "Attention"
          : "Something went wrong",
    text: message,
    confirmButtonText: "OK",
  });
};

const showFormError = async (message) => {
  await fireAlert({
    icon: "error",
    title: "Unable to save discount",
    text: message,
    confirmButtonText: "OK",
  });
};

const clearFormError = () => {
  if (!discountFormError) return;

  discountFormError.textContent = "";
  discountFormError.classList.remove("show");
};

const showLoading = (message = "Please wait...") => {
  if (!discountList) return;

  discountList.innerHTML = `
    <div class="discount-loading">
      <div class="loading-spinner"></div>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
};

const showEmptyState = (message) => {
  if (!discountList) return;

  discountList.innerHTML = `
    <div class="discount-empty-state">
      <div class="empty-icon">
        <i class="bi bi-ticket-perforated"></i>
      </div>
      <h3>No discounts found</h3>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
};

const showErrorState = (message) => {
  if (!discountList) return;

  discountList.innerHTML = `
    <div class="discount-error-state">
      <h3>Unable to load discounts</h3>
      <p>${escapeHtml(message)}</p>
      <button
        type="button"
        class="retry-discounts-btn"
        id="retryDiscountsBtn"
      >
        Try Again
      </button>
    </div>
  `;

  document
    .getElementById("retryDiscountsBtn")
    ?.addEventListener("click", loadDiscounts);
};

const loadEventDetails = async () => {
  try {
    const response = await authenticatedFetch("/api/host/events");
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to fetch event details."
      );
    }

    const events = Array.isArray(result.data) ? result.data : [];

    currentEvent = events.find(
      (event) => String(event._id) === String(eventId)
    );

    if (!currentEvent) {
      throw new Error(
        "Event not found or you do not have access to it."
      );
    }

    if (
      currentEvent.status !== "approved" ||
      currentEvent.isVisible !== true
    ) {
      throw new Error(
        "Discount management is available only for approved and visible events."
      );
    }

    renderEventSummary();
  } catch (error) {
    console.error("Load event details error:", error);

    if (
      error.message === "Authentication token not found." ||
      error.message === "Authentication expired."
    ) {
      return;
    }

    if (eventSummary) {
      eventSummary.innerHTML = `
        <div class="discount-event-error">
          ${escapeHtml(error.message)}
        </div>
      `;
    }

    if (addDiscountBtn) {
      addDiscountBtn.disabled = true;
    }
  }
};

const renderEventSummary = () => {
  if (!eventSummary || !currentEvent) return;

  const eventName = currentEvent.eventName || "Untitled Event";
  const city = currentEvent.location?.city || "Location unavailable";
  const banner = currentEvent.banner || "";

  eventSummary.innerHTML = `
    <div class="discount-event-summary">
      <div class="discount-event-image">
        ${
          banner
            ? `
              <img
                src="${escapeHtml(banner)}"
                alt="${escapeHtml(eventName)}"
              >
            `
            : `
              <div class="event-image-placeholder">
                <i class="bi bi-image"></i>
              </div>
            `
        }
      </div>

      <div class="discount-event-details">
        <span class="event-summary-label">
          MANAGING DISCOUNTS FOR
        </span>

        <h2>${escapeHtml(eventName)}</h2>

        <div class="event-summary-meta">
          <span>
            <i class="bi bi-calendar-event"></i>
            ${formatDate(currentEvent.eventDate)}
          </span>

          <span>
            <i class="bi bi-geo-alt"></i>
            ${escapeHtml(city)}
          </span>
        </div>

        <span class="event-summary-status">
          Approved Event
        </span>
      </div>
    </div>
  `;
};

const updateStatistics = () => {
  const now = new Date();

  const activeCount = discounts.filter((discount) => {
    const start = new Date(discount.startDate);
    const end = new Date(discount.endDate);

    return (
      discount.status === "active" &&
      start <= now &&
      end > now &&
      (
        discount.usageLimit === null ||
        discount.usageLimit === undefined ||
        discount.usedCount < discount.usageLimit
      )
    );
  }).length;

  const expiredCount = discounts.filter(
    (discount) => new Date(discount.endDate) <= now
  ).length;

  const redemptionCount = discounts.reduce(
    (total, discount) =>
      total + (Number(discount.usedCount) || 0),
    0
  );

  if (totalCouponsElement) {
    totalCouponsElement.textContent = discounts.length;
  }

  if (activeCouponsElement) {
    activeCouponsElement.textContent = activeCount;
  }

  if (expiredCouponsElement) {
    expiredCouponsElement.textContent = expiredCount;
  }

  if (totalRedemptionsElement) {
    totalRedemptionsElement.textContent = redemptionCount;
  }
};

const renderDiscounts = () => {
  if (!discountList) return;

  const searchValue =
    discountSearch?.value.trim().toLowerCase() || "";

  const selectedStatus =
    discountStatusFilter?.value || "all";

  const filteredDiscounts = discounts.filter((discount) => {
    const title = discount.title?.toLowerCase() || "";
    const code = discount.code?.toLowerCase() || "";
    const description = discount.description?.toLowerCase() || "";

    const state = getDiscountState(discount);

    const matchesSearch =
      title.includes(searchValue) ||
      code.includes(searchValue) ||
      description.includes(searchValue);

    const matchesStatus =
      selectedStatus === "all" ||
      selectedStatus === state;

    return matchesSearch && matchesStatus;
  });

  if (filteredDiscounts.length === 0) {
    showEmptyState(
      discounts.length === 0
        ? "Create your first discount coupon for this event."
        : "Try changing your search or status filter."
    );

    return;
  }

  discountList.innerHTML = filteredDiscounts
    .map((discount) => {
      const state = getDiscountState(discount);

      const discountText =
        discount.discountType === "percentage"
          ? `${discount.discountValue}% OFF`
          : `${formatCurrency(discount.discountValue)} OFF`;

      const usedCount = Number(discount.usedCount) || 0;

      const usageText =
        discount.usageLimit === null ||
        discount.usageLimit === undefined
          ? `${usedCount} used / Unlimited`
          : `${usedCount} / ${discount.usageLimit} used`;

      const remainingUsage =
        discount.usageLimit === null ||
        discount.usageLimit === undefined
          ? null
          : Math.max(0, discount.usageLimit - usedCount);

      const usagePercentage =
        discount.usageLimit > 0
          ? Math.min(100, (usedCount / discount.usageLimit) * 100)
          : 0;

      const canEdit = state !== "active";

      return `
        <article class="discount-card">
          <div class="discount-card-header">
            <div class="discount-card-heading">
              <h3>${escapeHtml(discount.title)}</h3>
            </div>

            ${getDiscountBadge(state)}
          </div>

          <div class="discount-code">
            <span>
              <i class="bi bi-ticket-perforated"></i>
              ${escapeHtml(discount.code)}
            </span>

            <span class="discount-value">
              ${escapeHtml(discountText)}
            </span>
          </div>

          <p class="discount-description">
            ${escapeHtml(
              discount.description || "No description provided."
            )}
          </p>

          <div class="discount-card-info">
            <div>
              <span>Minimum Booking</span>
              <strong>
                ${formatCurrency(discount.minBookingAmount)}
              </strong>
            </div>

            <div>
              <span>Redemptions</span>
              <strong>${escapeHtml(usageText)}</strong>
            </div>

            <div>
              <span>Valid From</span>
              <strong>${formatDate(discount.startDate)}</strong>
            </div>

            <div>
              <span>Valid Until</span>
              <strong>${formatDate(discount.endDate)}</strong>
            </div>
          </div>

          ${
            discount.discountType === "percentage" &&
            discount.maxDiscount
              ? `
                <div class="discount-cap">
                  <span>Maximum discount</span>
                  <strong>
                    ${formatCurrency(discount.maxDiscount)}
                  </strong>
                </div>
              `
              : ""
          }

          ${
            remainingUsage !== null
              ? `
                <div class="discount-usage-progress">
                  <div class="usage-progress-label">
                    <span>Coupon usage</span>
                    <span>${remainingUsage} remaining</span>
                  </div>

                  <div class="usage-progress-track">
                    <div
                      class="usage-progress-fill"
                      style="width: ${usagePercentage}%"
                    ></div>
                  </div>
                </div>
              `
              : ""
          }

          <div class="discount-card-actions">
            <button
              type="button"
              class="discount-action-btn edit-discount-btn"
              data-id="${escapeHtml(discount._id)}"
              ${canEdit ? "" : "disabled"}
            >
              <i class="bi bi-pencil"></i>
              Edit
            </button>

            <button
              type="button"
              class="discount-action-btn toggle-discount-btn"
              data-id="${escapeHtml(discount._id)}"
              ${
                state === "expired" || state === "exhausted"
                  ? "disabled"
                  : ""
              }
            >
              <i class="bi bi-power"></i>
              ${
                discount.status === "active"
                  ? "Deactivate"
                  : "Activate"
              }
            </button>

            <button
              type="button"
              class="discount-action-btn delete-discount-btn"
              data-id="${escapeHtml(discount._id)}"
            >
              <i class="bi bi-trash"></i>
              Delete
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  attachDiscountListeners();
};

const loadDiscounts = async () => {
  if (!eventId) {
    showErrorState("Event ID is missing.");
    return;
  }

  try {
    showLoading("Loading discount coupons...");

    const response = await authenticatedFetch(
      `/api/host/events/${eventId}/discounts`
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to load discounts."
      );
    }

    discounts = Array.isArray(result.discounts)
      ? result.discounts
      : [];

    updateStatistics();
    renderDiscounts();
  } catch (error) {
    console.error("Load discounts error:", error);

    if (
      error.message === "Authentication token not found." ||
      error.message === "Authentication expired."
    ) {
      return;
    }

    showErrorState(error.message);
  }
};

const openDiscountModal = () => {
  if (!discountModal) return;

  discountModal.classList.add("active");
  discountModal.setAttribute("aria-hidden", "false");

  document.body.classList.add("modal-open");

  clearFormError();

  document.getElementById("discountTitle")?.focus();
};

const closeModal = () => {
  if (!discountModal) return;

  discountModal.classList.remove("active");
  discountModal.setAttribute("aria-hidden", "true");

  document.body.classList.remove("modal-open");

  resetDiscountForm();
};

const resetDiscountForm = () => {
  if (discountForm) {
    discountForm.reset();
  }

  currentEditingDiscountId = null;

  clearFormError();

  if (discountModalTitle) {
    discountModalTitle.textContent = "Create Discount";
  }

  if (submitDiscountBtn) {
    submitDiscountBtn.textContent = "Create Discount";
    submitDiscountBtn.disabled = false;
  }

  if (maxDiscountInput) {
    maxDiscountInput.disabled = false;
  }

  const startDateInput = document.getElementById("startDate");
  const endDateInput = document.getElementById("endDate");

  const now = new Date();
  const defaultStartDate = new Date(now.getTime() + 5 * 60000);
  const defaultEndDate = new Date(now.getTime() + 24 * 60 * 60000);

  if (startDateInput) {
    startDateInput.value = formatDateTimeLocal(defaultStartDate);
  }

  if (endDateInput) {
    endDateInput.value = formatDateTimeLocal(defaultEndDate);
  }

  updateDiscountTypeFields();
};

const updateDiscountTypeFields = () => {
  if (!discountTypeInput || !maxDiscountInput) return;

  const isPercentage =
    discountTypeInput.value === "percentage";

  maxDiscountInput.disabled = !isPercentage;

  if (!isPercentage) {
    maxDiscountInput.value = "";
  }

  if (discountValueSymbol) {
    discountValueSymbol.textContent =
      isPercentage ? "%" : "₹";
  }

  const maxDiscountGroup =
    maxDiscountInput.closest(".form-group");

  if (maxDiscountGroup) {
    maxDiscountGroup.style.opacity =
      isPercentage ? "1" : "0.5";
  }
};

const populateDiscountForm = (discount) => {
  document.getElementById("discountTitle").value =
    discount.title || "";

  document.getElementById("discountCode").value =
    discount.code || "";

  document.getElementById("discountDescription").value =
    discount.description || "";

  discountTypeInput.value =
    discount.discountType || "percentage";

  discountValueInput.value =
    discount.discountValue ?? "";

  maxDiscountInput.value =
    discount.maxDiscount ?? "";

  document.getElementById("minBookingAmount").value =
    discount.minBookingAmount ?? 0;

  document.getElementById("usageLimit").value =
    discount.usageLimit ?? "";

  document.getElementById("perUserLimit").value =
    discount.perUserLimit ?? 1;

  document.getElementById("startDate").value =
    formatDateTimeLocal(discount.startDate);

  document.getElementById("endDate").value =
    formatDateTimeLocal(discount.endDate);

  updateDiscountTypeFields();
};

const editDiscount = async (discountId) => {
  try {
    const response = await authenticatedFetch(
      `/api/host/discounts/${discountId}`
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to fetch discount."
      );
    }

    const discount = result.discount;

    if (!discount) {
      throw new Error("Discount information is unavailable.");
    }

    if (
      discount.status === "active" &&
      getDiscountState(discount) === "active"
    ) {
      await showMessage(
        "Deactivate this coupon before editing it.",
        "warning"
      );

      return;
    }

    resetDiscountForm();

    currentEditingDiscountId = discountId;

    populateDiscountForm(discount);

    if (discountModalTitle) {
      discountModalTitle.textContent = "Edit Discount";
    }

    if (submitDiscountBtn) {
      submitDiscountBtn.textContent = "Save Changes";
    }

    openDiscountModal();
  } catch (error) {
    console.error("Edit discount error:", error);

    if (
      error.message !== "Authentication expired." &&
      error.message !== "Authentication token not found."
    ) {
      showMessage(error.message, "error");
    }
  }
};

const validateDiscountForm = () => {
  const title =
    document.getElementById("discountTitle").value.trim();

  const code =
    document.getElementById("discountCode").value.trim();

  const discountType = discountTypeInput.value;
  const discountValue = Number(discountValueInput.value);
  const maxDiscount = maxDiscountInput.value;

  const minBookingAmount = Number(
    document.getElementById("minBookingAmount").value
  );

  const usageLimit =
    document.getElementById("usageLimit").value;

  const perUserLimit = Number(
    document.getElementById("perUserLimit").value
  );

  const startDate = new Date(
    document.getElementById("startDate").value
  );

  const endDate = new Date(
    document.getElementById("endDate").value
  );

  if (!title || !code) {
    throw new Error(
      "Please enter the discount title and coupon code."
    );
  }

  if (title.length > 100) {
    throw new Error(
      "Discount title cannot exceed 100 characters."
    );
  }

  if (!/^[A-Za-z0-9_-]{3,30}$/.test(code)) {
    throw new Error(
      "Coupon code must contain 3–30 letters, numbers, underscores or hyphens."
    );
  }

  if (!["percentage", "fixed"].includes(discountType)) {
    throw new Error("Please select a valid discount type.");
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new Error(
      "Discount value must be greater than zero."
    );
  }

  if (
    discountType === "percentage" &&
    discountValue > 100
  ) {
    throw new Error(
      "Percentage discount cannot exceed 100%."
    );
  }

  if (
    discountType === "percentage" &&
    maxDiscount !== "" &&
    (
      !Number.isFinite(Number(maxDiscount)) ||
      Number(maxDiscount) <= 0
    )
  ) {
    throw new Error(
      "Please enter a valid maximum discount."
    );
  }

  if (discountType === "fixed" && maxDiscount !== "") {
    throw new Error(
      "Maximum discount is only applicable to percentage discounts."
    );
  }

  if (
    !Number.isFinite(minBookingAmount) ||
    minBookingAmount < 0
  ) {
    throw new Error(
      "Minimum booking amount cannot be negative."
    );
  }

  if (
    usageLimit !== "" &&
    (
      !Number.isInteger(Number(usageLimit)) ||
      Number(usageLimit) < 1
    )
  ) {
    throw new Error(
      "Usage limit must be a positive integer."
    );
  }

  if (
    !Number.isInteger(perUserLimit) ||
    perUserLimit < 1
  ) {
    throw new Error(
      "Per-user limit must be a positive integer."
    );
  }

  if (
    Number.isNaN(startDate.getTime()) ||
    Number.isNaN(endDate.getTime())
  ) {
    throw new Error(
      "Please select valid start and end dates."
    );
  }

  if (endDate <= startDate) {
    throw new Error(
      "End date must be later than start date."
    );
  }

  if (endDate <= new Date()) {
    throw new Error(
      "Discount end date must be in the future."
    );
  }

  return {
    title,
    code: code.toUpperCase(),
    description: document
      .getElementById("discountDescription")
      .value.trim(),
    discountType,
    discountValue,
    maxDiscount:
      discountType === "percentage" && maxDiscount !== ""
        ? Number(maxDiscount)
        : null,
    minBookingAmount,
    usageLimit:
      usageLimit === "" ? null : Number(usageLimit),
    perUserLimit,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
};

const saveDiscount = async (event) => {
  event.preventDefault();

  if (submitDiscountBtn?.disabled) return;

  clearFormError();

  const isEditing = Boolean(currentEditingDiscountId);

  try {
    const formData = validateDiscountForm();

    const confirmation = await fireAlert({
      icon: "question",
      title: isEditing ? "Update discount?" : "Create discount?",
      text: isEditing
        ? "Are you sure you want to save these changes?"
        : "Are you sure you want to create this coupon?",
      showCancelButton: true,
      confirmButtonText: isEditing ? "Save Changes" : "Create Coupon",
      cancelButtonText: "Cancel",
      reverseButtons: true,
    });

    if (!confirmation.isConfirmed) return;

    submitDiscountBtn.disabled = true;
    submitDiscountBtn.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2"></span>Saving...';

    const url = isEditing
      ? `/api/host/discounts/${currentEditingDiscountId}`
      : "/api/host/discounts";

    const method = isEditing ? "PATCH" : "POST";

    const payload = isEditing
      ? formData
      : {
          ...formData,
          eventId,
        };

    const response = await authenticatedFetch(url, {
      method,
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to save discount."
      );
    }

    closeModal();

    await fireAlert({
      icon: "success",
      title: isEditing ? "Discount Updated!" : "Discount Created!",
      text: result.message ||
        (isEditing
          ? "Your discount has been updated successfully."
          : "Your new coupon has been created successfully."),
      confirmButtonText: "Great!",
    });

    await loadDiscounts();

  } catch (error) {
    console.error("Save discount error:", error);

    if (
      error.message === "Authentication expired." ||
      error.message === "Authentication token not found."
    ) {
      return;
    }

    await showFormError(error.message);

  } finally {
    if (submitDiscountBtn) {
      submitDiscountBtn.disabled = false;
      submitDiscountBtn.textContent = currentEditingDiscountId
        ? "Save Changes"
        : "Create Discount";
    }
  }
};

const toggleDiscount = async (discountId) => {
  const discount = discounts.find(
    (item) => String(item._id) === String(discountId)
  );

  if (!discount) return;

  const isActive = discount.status === "active";

  const confirmation = await fireAlert({
    icon: "warning",
    title: isActive
      ? "Deactivate coupon?"
      : "Activate coupon?",
    text: isActive
      ? "Customers will no longer be able to use this coupon."
      : "This coupon will become eligible for use when its validity conditions are met.",
    showCancelButton: true,
    confirmButtonText: isActive
      ? "Deactivate"
      : "Activate",
    cancelButtonText: "Cancel",
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  try {
    const response = await authenticatedFetch(
      `/api/host/discounts/${discountId}/status`,
      {
        method: "PATCH",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to update coupon status."
      );
    }

    await showMessage(
      result.message || "Coupon status updated successfully."
    );

    await loadDiscounts();
  } catch (error) {
    console.error("Toggle discount error:", error);

    if (
      error.message !== "Authentication expired." &&
      error.message !== "Authentication token not found."
    ) {
      showMessage(error.message, "error");
    }
  }
};

const deleteDiscount = async (discountId) => {
  const confirmation = await fireAlert({
    icon: "warning",
    title: "Delete coupon?",
    text: "This action permanently deletes this coupon. Existing booking history should be protected by the server.",
    showCancelButton: true,
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    confirmButtonColor: "#dc3545",
  });

  if (!confirmation.isConfirmed) {
    return;
  }

  try {
    const response = await authenticatedFetch(
      `/api/host/discounts/${discountId}`,
      {
        method: "DELETE",
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Unable to delete coupon."
      );
    }

    await showMessage(
      result.message || "Coupon deleted successfully."
    );

    await loadDiscounts();
  } catch (error) {
    console.error("Delete discount error:", error);

    if (
      error.message !== "Authentication expired." &&
      error.message !== "Authentication token not found."
    ) {
      showMessage(error.message, "error");
    }
  }
};

const attachDiscountListeners = () => {
  document.querySelectorAll(".edit-discount-btn").forEach((button) => {
    button.addEventListener("click", () => {
      editDiscount(button.dataset.id);
    });
  });

  document.querySelectorAll(".toggle-discount-btn").forEach((button) => {
    button.addEventListener("click", () => {
      toggleDiscount(button.dataset.id);
    });
  });

  document.querySelectorAll(".delete-discount-btn").forEach((button) => {
    button.addEventListener("click", () => {
      deleteDiscount(button.dataset.id);
    });
  });
};

addDiscountBtn?.addEventListener("click", () => {
  resetDiscountForm();
  openDiscountModal();
});

closeDiscountModal?.addEventListener("click", closeModal);

cancelDiscountBtn?.addEventListener("click", closeModal);

discountForm?.addEventListener("submit", saveDiscount);

discountTypeInput?.addEventListener(
  "change",
  updateDiscountTypeFields
);

discountSearch?.addEventListener("input", renderDiscounts);

discountStatusFilter?.addEventListener(
  "change",
  renderDiscounts
);

discountModal?.addEventListener("click", (event) => {
  if (
    event.target === discountModal ||
    event.target.classList.contains("discount-modal-overlay")
  ) {
    closeModal();
  }
});

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    discountModal?.classList.contains("active")
  ) {
    closeModal();
  }
});

const initializeDiscountPage = async () => {
  if (!eventId) {
    showErrorState("Event ID is missing.");
    return;
  }

  await loadEventDetails();

  if (!currentEvent) {
    return;
  }

  await loadDiscounts();
};

initializeDiscountPage();