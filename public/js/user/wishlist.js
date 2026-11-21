const wishlistContainer = document.getElementById("wishlist-container");
const wishlistCount = document.getElementById("wishlist-count");
const wishlistSubtitle = document.getElementById("wishlist-subtitle");

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

const formatEventDate = (date) => {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString("en-IN")}`;

const getStartingPrice = (event) => {
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];

  if (!tickets.length) {
    return null;
  }

  const prices = tickets
    .map((ticket) => Number(ticket.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  return prices.length ? Math.min(...prices) : null;
};

const showLoading = () => {
  wishlistContainer.innerHTML = `
    <div class="wishlist-loading">
      <div class="wishlist-spinner"></div>
      <p>Loading your wishlist...</p>
    </div>
  `;
};

const showEmptyState = () => {
  wishlistCount.textContent = "0";
  wishlistSubtitle.textContent = "No saved events yet.";

  wishlistContainer.innerHTML = `
    <div class="wishlist-empty-state">
      <div class="wishlist-empty-icon">
        <i class="bi bi-heart"></i>
      </div>

      <h3>Your wishlist is waiting!</h3>

      <p>
        You haven't saved any events yet.
        Explore exciting experiences and save the ones you love.
      </p>

      <a href="/events" class="wishlist-empty-btn">
        <i class="bi bi-compass"></i>
        Explore Events
      </a>
    </div>
  `;
};

const showErrorState = (message) => {
  wishlistContainer.innerHTML = `
    <div class="wishlist-error-state">
      <i class="bi bi-exclamation-circle"></i>
      <h3>Unable to load wishlist</h3>
      <p>${escapeHtml(message)}</p>

      <button type="button" id="retry-wishlist">
        Try Again
      </button>
    </div>
  `;
};

const createWishlistCard = (item) => {
  const event = item.event;

  if (!event || !event._id) {
    return null;
  }

  const card = document.createElement("article");
  card.className = "wishlist-card";

  const eventId = String(event._id);

  const banner = event.banner
    ? `
      <img
        src="${escapeHtml(event.banner)}"
        alt="${escapeHtml(event.eventName)}"
        class="wishlist-card-image"
        loading="lazy"
      >
    `
    : `
      <div class="wishlist-card-placeholder">
        <i class="bi bi-image"></i>
      </div>
    `;

  const startingPrice = getStartingPrice(event);

  card.innerHTML = `
    <div class="wishlist-card-banner">
      ${banner}

      <span class="wishlist-category">
        ${escapeHtml(event.category?.name || "Event")}
      </span>

      <button
        type="button"
        class="wishlist-remove-btn"
        data-event-id="${escapeHtml(eventId)}"
        aria-label="Remove ${escapeHtml(event.eventName)} from wishlist"
        title="Remove from wishlist"
      >
        <i class="bi bi-heart-fill"></i>
      </button>
    </div>

    <div class="wishlist-card-content">

      <h3>${escapeHtml(event.eventName || "Untitled Event")}</h3>

      <div class="wishlist-event-detail">
        <i class="bi bi-geo-alt"></i>
        <span>${escapeHtml(event.location?.city || "Location unavailable")}</span>
      </div>

      <div class="wishlist-event-detail">
        <i class="bi bi-calendar3"></i>
        <span>${formatEventDate(event.eventDate)}</span>
      </div>

      <div class="wishlist-card-footer">

        <div class="wishlist-price">
          <span>Starting from</span>
          <strong>
            ${startingPrice !== null ? formatCurrency(startingPrice) : "View details"}
          </strong>
        </div>

        <a
          href="/events/${encodeURIComponent(eventId)}"
          class="wishlist-explore-btn"
        >
          Explore
          <i class="bi bi-arrow-up-right"></i>
        </a>

      </div>
    </div>
  `;

  return card;
};

const renderWishlist = (wishlist) => {
  const validItems = wishlist.filter(
    (item) => item.event && item.event._id
  );

  wishlistCount.textContent = validItems.length;
  wishlistSubtitle.textContent =
    `${validItems.length} ${validItems.length === 1 ? "event" : "events"} saved for later.`;

  if (!validItems.length) {
    showEmptyState();
    return;
  }

  wishlistContainer.innerHTML = "";

  validItems.forEach((item) => {
    const card = createWishlistCard(item);

    if (card) {
      wishlistContainer.appendChild(card);
    }
  });
};

const loadWishlist = async () => {
  const token = getAuthToken();

  if (!token) {
    window.location.href = `/login?redirect=${encodeURIComponent("/user/wishlist")}`;
    return;
  }

  showLoading();

  try {
    const response = await fetch("/api/users/wishlist", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      window.location.href = `/login?redirect=${encodeURIComponent("/user/wishlist")}`;
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to fetch wishlist.");
    }

    const wishlist =
      result.wishlist ||
      result.data?.wishlist ||
      result.data ||
      [];

    if (!Array.isArray(wishlist)) {
      throw new Error("Invalid wishlist response.");
    }

    renderWishlist(wishlist);

  } catch (error) {
    console.error("Wishlist Loading Error:", error);
    showErrorState(error.message);
  }
};

const removeWishlistItem = async (eventId, button) => {
  const token = getAuthToken();

  if (!token) {
    window.location.href = `/login?redirect=${encodeURIComponent("/user/wishlist")}`;
    return;
  }

  if (button.disabled) return;

  button.disabled = true;

  try {
    const response = await fetch(
      `/api/users/wishlist/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      window.location.href = `/login?redirect=${encodeURIComponent("/user/wishlist")}`;
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to remove event.");
    }

    await loadWishlist();

    if (typeof Swal !== "undefined") {
      Swal.fire({
        toast: true,
        position: "top-end",
        icon: "success",
        title: "Removed from wishlist",
        showConfirmButton: false,
        timer: 1800,
      });
    }

  } catch (error) {
    console.error("Remove Wishlist Error:", error);

    button.disabled = false;

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: "Unable to remove event",
        text: error.message,
      });
    } else {
      alert(error.message);
    }
  }
};

wishlistContainer.addEventListener("click", (event) => {
  const removeButton = event.target.closest(".wishlist-remove-btn");

  if (!removeButton) return;

  const eventId = removeButton.dataset.eventId;

  if (eventId) {
    removeWishlistItem(eventId, removeButton);
  }
});

wishlistContainer.addEventListener("click", (event) => {
  if (event.target.closest("#retry-wishlist")) {
    loadWishlist();
  }
});

loadWishlist();