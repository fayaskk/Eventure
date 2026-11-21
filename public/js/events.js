const eventContainer = document.getElementById("events-container");
const eventCount = document.getElementById("event-count");
const eventsSectionTitle = document.getElementById("events-section-title");
const paginationContainer = document.getElementById("events-pagination");

const categoryFilter = document.getElementById("category-filter");
const dateSort = document.getElementById("date-sort");

const activeFilters = document.getElementById("active-filters");
const activeFilterText = document.getElementById("active-filter-text");
const clearFiltersButton = document.getElementById("clear-filters");

const navbarSearchInput = document.getElementById("navbarSearchInput");
const navbarSearchForm = document.getElementById("navbarSearchForm");

const offersCarousel = document.querySelector(".hero-section");
const offersTrack = document.getElementById("offers-track");
const offerPrev = document.getElementById("offer-prev");
const offerNext = document.getElementById("offer-next");
const offerIndicators = document.getElementById("offer-indicators");
const currentSlideElement = document.getElementById("hero-current-slide");

let wishlistEventIds = new Set();
let wishlistLoading = false;

const getAuthToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken")
  );
};

const urlParams = new URLSearchParams(window.location.search);

let selectedCategory = urlParams.get("category") || "";
let searchQuery = urlParams.get("search") || "";

let categories = [];
let currentPage = 1;
const eventsPerPage = 9;

let currentOfferIndex = 0;
let offerInterval = null;
let activeRequest = null;
let requestId = 0;
let searchTimeout = null;

const offerSlides = offersTrack ? Array.from(offersTrack.children) : [];

const offerDots = offerIndicators
  ? Array.from(offerIndicators.querySelectorAll(".hero-indicator"))
  : [];

const featuredSections = [
  {
    endpoint: "/api/events/highlighted",
    container: "highlighted-events",
    section: "highlighted-section",
  },
  {
    endpoint: "/api/events/featured",
    container: "featured-events",
    section: "featured-section",
  },
  {
    endpoint: "/api/events/most-booked",
    container: "popular-events",
    section: "popular-section",
  },
];

if (navbarSearchInput) {
  navbarSearchInput.value = searchQuery;
}

if (dateSort) {
  dateSort.value = "newest";
}

const showOffer = (index) => {
  if (!offersTrack || !offerSlides.length) return;

  currentOfferIndex = (index + offerSlides.length) % offerSlides.length;

  offersTrack.style.transform = `translateX(-${currentOfferIndex * 100}%)`;

  offerDots.forEach((dot, dotIndex) => {
    const active = dotIndex === currentOfferIndex;

    dot.classList.toggle("active", active);

    if (active) {
      dot.setAttribute("aria-current", "true");
    } else {
      dot.removeAttribute("aria-current");
    }
  });

  if (currentSlideElement) {
    currentSlideElement.textContent = String(currentOfferIndex + 1).padStart(
      2,
      "0",
    );
  }
};

const stopOfferAutoSlide = () => {
  if (!offerInterval) return;

  clearInterval(offerInterval);
  offerInterval = null;
};

const startOfferAutoSlide = () => {
  stopOfferAutoSlide();

  if (offerSlides.length <= 1) return;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  if (document.hidden) return;

  offerInterval = setInterval(() => {
    showOffer(currentOfferIndex + 1);
  }, 6000);
};

offerPrev?.addEventListener("click", () => {
  showOffer(currentOfferIndex - 1);
  startOfferAutoSlide();
});

offerNext?.addEventListener("click", () => {
  showOffer(currentOfferIndex + 1);
  startOfferAutoSlide();
});

offerDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    showOffer(Number(dot.dataset.slide));
    startOfferAutoSlide();
  });
});

offersCarousel?.addEventListener("mouseenter", stopOfferAutoSlide);
offersCarousel?.addEventListener("mouseleave", startOfferAutoSlide);
offersCarousel?.addEventListener("focusin", stopOfferAutoSlide);
offersCarousel?.addEventListener("focusout", startOfferAutoSlide);

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopOfferAutoSlide();
  } else {
    startOfferAutoSlide();
  }
});

let touchStartX = 0;

offersCarousel?.addEventListener(
  "touchstart",
  (event) => {
    touchStartX = event.changedTouches[0].screenX;
  },
  { passive: true },
);

offersCarousel?.addEventListener(
  "touchend",
  (event) => {
    const touchEndX = event.changedTouches[0].screenX;
    const difference = touchStartX - touchEndX;

    if (Math.abs(difference) < 50) return;

    if (difference > 0) {
      showOffer(currentOfferIndex + 1);
    } else {
      showOffer(currentOfferIndex - 1);
    }

    startOfferAutoSlide();
  },
  { passive: true },
);

showOffer(0);
startOfferAutoSlide();

const updateUrl = () => {
  const params = new URLSearchParams();

  if (searchQuery) {
    params.set("search", searchQuery);
  }

  if (selectedCategory) {
    params.set("category", selectedCategory);
  }

  const query = params.toString();
  const newUrl = query ? `/events?${query}` : "/events";

  window.history.replaceState({}, "", newUrl);
};

const createLoadingState = () => {
  if (!eventContainer) return;

  eventContainer.innerHTML = `
    <div class="events-loading">
      <span class="loading-spinner"></span>
      <p>Finding experiences for you...</p>
    </div>
  `;
};

const createMessageState = (title, description, icon) => {
  const wrapper = document.createElement("div");
  wrapper.className = "events-message-state";

  const iconElement = document.createElement("div");
  iconElement.className = "message-state-icon";

  const iconTag = document.createElement("i");
  iconTag.className = icon;

  iconElement.appendChild(iconTag);

  const heading = document.createElement("h3");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = description;

  wrapper.append(iconElement, heading, paragraph);

  return wrapper;
};

const formatEventDate = (date) => {
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

const formatCurrency = (amount) => {
  const value = Number(amount);

  if (!Number.isFinite(value)) {
    return "Price unavailable";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const getStartingPrice = (event) => {
  const prices = (event.tickets || [])
    .map((ticket) => Number(ticket.price))
    .filter((price) => Number.isFinite(price) && price >= 0);

  return prices.length ? Math.min(...prices) : null;
};

const loadWishlist = async () => {
  const token = getAuthToken();

  if (!token) {
    wishlistEventIds.clear();
    return;
  }

  try {
    const response = await fetch("/api/users/wishlist", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load wishlist.");
    }

    const wishlist =
      result.wishlist || result.data?.wishlist || result.data || [];

    wishlistEventIds = new Set(
      wishlist
        .filter((item) => item.event?._id)
        .map((item) => String(item.event._id)),
    );
  } catch (error) {
    console.error("Wishlist Loading Error:", error);
  }
};

const toggleWishlist = async (eventId, button) => {
  const token = getAuthToken();

  if (!token) {
    window.location.href = "/login";
    return;
  }

  if (button.disabled) return;

  const isWishlisted = wishlistEventIds.has(String(eventId));

  const method = isWishlisted ? "DELETE" : "POST";

  button.disabled = true;

  try {
    const response = await fetch(
      `/api/users/wishlist/${encodeURIComponent(eventId)}`,
      {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Wishlist update failed.");
    }

    if (isWishlisted) {
      wishlistEventIds.delete(String(eventId));
    } else {
      wishlistEventIds.add(String(eventId));
    }

    const icon = button.querySelector("i");

    const updatedState = wishlistEventIds.has(String(eventId));

    icon.className = updatedState ? "bi bi-heart-fill" : "bi bi-heart";

    button.classList.toggle("wishlisted", updatedState);

    button.setAttribute(
      "aria-label",
      updatedState ? "Remove from wishlist" : "Add to wishlist",
    );

    button.setAttribute("aria-pressed", String(updatedState));
  } catch (error) {
    console.error("Wishlist Update Error:", error);

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: "Unable to update wishlist",
        text: error.message,
      });
    } else {
      alert(error.message);
    }
  } finally {
    button.disabled = false;
  }
};

const createEventCard = (event, index = 0) => {
  const card = document.createElement("article");

  card.className = "event-card";
  card.style.setProperty("--card-index", index);
  const wishlistButton = document.createElement("button");

  const eventId = String(event._id);

  const isWishlisted = wishlistEventIds.has(eventId);

  wishlistButton.type = "button";
  wishlistButton.className = `event-wishlist-btn ${
    isWishlisted ? "wishlisted" : ""
  }`;

  wishlistButton.innerHTML = `
  <i class="bi ${isWishlisted ? "bi-heart-fill" : "bi-heart"}"></i>
`;

  wishlistButton.setAttribute(
    "aria-label",
    isWishlisted ? "Remove from wishlist" : "Add to wishlist",
  );

  wishlistButton.setAttribute("aria-pressed", String(isWishlisted));

  wishlistButton.addEventListener("click", (clickEvent) => {
    clickEvent.preventDefault();
    clickEvent.stopPropagation();

    toggleWishlist(eventId, wishlistButton);
  });

  const imageWrapper = document.createElement("div");

  imageWrapper.className = "event-banner-wrapper";

  const bannerUrl = event.banner || "";

  if (bannerUrl) {
    imageWrapper.classList.add("has-banner-background");

    const backdrop = document.createElement("img");

    backdrop.className = "event-card-image-backdrop";
    backdrop.src = bannerUrl;
    backdrop.alt = "";
    backdrop.setAttribute("aria-hidden", "true");
    backdrop.loading = "lazy";

    const image = document.createElement("img");

    image.className = "event-card-image";
    image.src = bannerUrl;
    image.alt = event.eventName || "Event banner";
    image.loading = "lazy";
    image.decoding = "async";

    const handleImageError = () => {
      image.remove();
      backdrop.remove();

      imageWrapper.classList.remove("has-banner-background");
      imageWrapper.classList.add("event-image-unavailable");

      if (!imageWrapper.querySelector(".event-image-fallback")) {
        const fallback = document.createElement("i");

        fallback.className = "bi bi-image event-image-fallback";
        fallback.setAttribute("aria-hidden", "true");

        imageWrapper.appendChild(fallback);
      }
    };

    image.addEventListener("error", handleImageError, { once: true });

    backdrop.addEventListener("error", () => backdrop.remove(), { once: true });

    imageWrapper.append(backdrop, image);
  } else {
    imageWrapper.classList.add("event-image-unavailable");

    const fallback = document.createElement("i");

    fallback.className = "bi bi-image event-image-fallback";
    fallback.setAttribute("aria-hidden", "true");

    imageWrapper.appendChild(fallback);
  }

  const imageOverlay = document.createElement("div");

  imageOverlay.className = "event-image-overlay";

  const category = document.createElement("span");

  category.className = "event-image-category";
  category.textContent = event.category?.name || "Event";

  imageOverlay.appendChild(category);
  imageWrapper.appendChild(imageOverlay);

  const content = document.createElement("div");

  content.className = "event-card-content";

  const title = document.createElement("h3");

  title.className = "event-card-title";
  title.textContent = event.eventName || "Untitled Event";

  const details = document.createElement("div");

  details.className = "event-card-details";

  const location = document.createElement("div");

  location.className = "event-detail";

  const locationIcon = document.createElement("i");

  locationIcon.className = "bi bi-geo-alt";

  const locationText = document.createElement("span");

  locationText.textContent = event.location?.city || "Location unavailable";

  location.append(locationIcon, locationText);

  const date = document.createElement("div");

  date.className = "event-detail";

  const dateIcon = document.createElement("i");

  dateIcon.className = "bi bi-calendar3";

  const dateText = document.createElement("span");

  dateText.textContent = formatEventDate(event.eventDate);

  date.append(dateIcon, dateText);

  details.append(location, date);

  const footer = document.createElement("div");

  footer.className = "event-card-footer";

  const price = document.createElement("div");

  price.className = "event-card-price";

  const priceLabel = document.createElement("span");

  priceLabel.textContent = "Starting from";

  const priceValue = document.createElement("strong");

  const startingPrice = getStartingPrice(event);

  priceValue.textContent =
    startingPrice !== null ? formatCurrency(startingPrice) : "View details";

  price.append(priceLabel, priceValue);

  const link = document.createElement("a");

  link.href = `/events/${encodeURIComponent(event._id)}`;
  link.className = "view-event-btn";

  link.setAttribute("aria-label", `Explore ${event.eventName || "event"}`);

  link.textContent = "Explore";

  const arrow = document.createElement("i");

  arrow.className = "bi bi-arrow-up-right";
  arrow.setAttribute("aria-hidden", "true");

  link.appendChild(arrow);

  footer.append(price, link);

  content.append(title, details, footer);

  card.append(imageWrapper, content, wishlistButton);

  return card;
};

const renderEvents = (events) => {
  if (!eventContainer) return;

  eventContainer.innerHTML = "";

  const fragment = document.createDocumentFragment();

  events.forEach((event, index) => {
    fragment.appendChild(createEventCard(event, index));
  });

  eventContainer.appendChild(fragment);
};

const renderPagination = (totalPages) => {
  if (!paginationContainer) return;

  paginationContainer.innerHTML = "";

  if (totalPages <= 1) return;

  const createButton = (label, page, options = {}) => {
    const button = document.createElement("button");

    button.type = "button";

    button.className = `pagination-btn ${options.active ? "active" : ""}`;

    button.textContent = label;
    button.disabled = Boolean(options.disabled);

    if (options.active) {
      button.setAttribute("aria-current", "page");
    }

    button.addEventListener("click", () => {
      if (page === currentPage || page < 1 || page > totalPages) {
        return;
      }

      currentPage = page;
      loadEvents();
    });

    return button;
  };

  paginationContainer.appendChild(
    createButton("Previous", currentPage - 1, {
      disabled: currentPage === 1,
    }),
  );

  const maxVisiblePages = 5;

  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  if (startPage > 1) {
    paginationContainer.appendChild(createButton("1", 1));

    if (startPage > 2) {
      const dots = document.createElement("span");

      dots.className = "pagination-dots";
      dots.textContent = "···";

      paginationContainer.appendChild(dots);
    }
  }

  for (let page = startPage; page <= endPage; page++) {
    paginationContainer.appendChild(
      createButton(String(page), page, {
        active: page === currentPage,
      }),
    );
  }

  if (endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement("span");

      dots.className = "pagination-dots";
      dots.textContent = "···";

      paginationContainer.appendChild(dots);
    }

    paginationContainer.appendChild(
      createButton(String(totalPages), totalPages),
    );
  }

  paginationContainer.appendChild(
    createButton("Next", currentPage + 1, {
      disabled: currentPage === totalPages,
    }),
  );
};

const updateActiveFilters = () => {
  if (!activeFilters || !activeFilterText) return;

  const selected = categories.find(
    (category) => category.slug === selectedCategory,
  );

  const filters = [];

  if (searchQuery) {
    filters.push(`Search: "${searchQuery}"`);
  }

  if (selected) {
    filters.push(`Category: ${selected.name}`);
  }

  activeFilters.hidden = filters.length === 0;

  activeFilterText.textContent = filters.join(" · ");
};

const updateCategorySelection = () => {
  const selected = categories.find(
    (category) => category.slug === selectedCategory,
  );

  if (eventsSectionTitle) {
    eventsSectionTitle.textContent = selected
      ? `${selected.name} events`
      : "Explore all events";
  }

  if (categoryFilter) {
    categoryFilter.value = selectedCategory;
  }

  updateActiveFilters();
};

const loadEvents = async () => {
  if (!eventContainer) return;

  if (activeRequest) {
    activeRequest.abort();
  }

  activeRequest = new AbortController();

  const currentRequestId = ++requestId;

  createLoadingState();

  try {
    const params = new URLSearchParams();

    if (searchQuery) {
      params.set("search", searchQuery);
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    params.set("sort", dateSort?.value || "newest");
    params.set("page", currentPage);
    params.set("limit", eventsPerPage);

    const response = await fetch(`/api/events?${params.toString()}`, {
      signal: activeRequest.signal,
      headers: {
        Accept: "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch events.");
    }

    if (currentRequestId !== requestId) return;

    const events = result.events || [];
    const pagination = result.pagination || {};

    const totalEvents = pagination.totalEvents ?? events.length;
    const totalPages = pagination.totalPages ?? 1;

    if (eventCount) {
      eventCount.textContent = `${totalEvents} ${
        totalEvents === 1 ? "experience" : "experiences"
      } found`;
    }

    if (!events.length) {
      eventContainer.innerHTML = "";

      eventContainer.appendChild(
        createMessageState(
          "No events found",
          "Try another search or choose a different category.",
          "bi bi-calendar-x",
        ),
      );

      renderPagination(0);

      return;
    }

    renderEvents(events);
    renderPagination(totalPages);
  } catch (error) {
    if (error.name === "AbortError") return;

    if (currentRequestId !== requestId) return;

    console.error("Events Page Error:", error);

    eventContainer.innerHTML = "";

    eventContainer.appendChild(
      createMessageState(
        "Something went wrong",
        "We couldn't load events right now. Please try again.",
        "bi bi-cloud-slash",
      ),
    );

    if (paginationContainer) {
      paginationContainer.innerHTML = "";
    }

    if (eventCount) {
      eventCount.textContent = "Unable to load events";
    }
  }
};

const getCategoryIcon = (name = "") => {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("music")) return "♫";
  if (normalizedName.includes("sport")) return "⚽";
  if (normalizedName.includes("tech")) return "💻";
  if (normalizedName.includes("business")) return "💼";

  if (normalizedName.includes("health") || normalizedName.includes("medical")) {
    return "✚";
  }

  if (normalizedName.includes("art")) return "🎨";
  if (normalizedName.includes("food")) return "🍽";
  if (normalizedName.includes("education")) return "📚";
  if (normalizedName.includes("travel")) return "✈";
  if (normalizedName.includes("workshop")) return "✦";
  if (normalizedName.includes("comedy")) return "✦";

  return "✦";
};

const renderCategories = () => {
  if (!categoryFilter) return;

  categoryFilter.innerHTML = "";

  const allOption = document.createElement("option");

  allOption.value = "";
  allOption.textContent = "All categories";

  categoryFilter.appendChild(allOption);

  categories.forEach((category) => {
    const option = document.createElement("option");

    option.value = category.slug;
    option.textContent = `${getCategoryIcon(category.name)} ${category.name}`;

    categoryFilter.appendChild(option);
  });

  categoryFilter.value = selectedCategory;

  updateCategorySelection();
};

const loadCategories = async () => {
  if (!categoryFilter) return;

  try {
    const response = await fetch("/api/categories", {
      headers: {
        Accept: "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch categories.");
    }

    const categoryData = result.categories || result.data || [];

    categories = Array.isArray(categoryData) ? categoryData : [];

    renderCategories();
  } catch (error) {
    console.error("Categories Page Error:", error);

    categoryFilter.innerHTML = "";

    const option = document.createElement("option");

    option.value = "";
    option.textContent = "Categories unavailable";

    categoryFilter.appendChild(option);
  }
};

const loadCollection = async (collection) => {
  const container = document.getElementById(collection.container);
  const section = document.getElementById(collection.section);

  if (!container || !section) return;

  try {
    const response = await fetch(collection.endpoint, {
      headers: {
        Accept: "application/json",
      },
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Unable to load events.");
    }

    const events = result.events || result.data || [];

    if (!Array.isArray(events) || !events.length) {
      section.hidden = true;
      return;
    }

    container.innerHTML = "";

    const fragment = document.createDocumentFragment();

    events.forEach((event, index) => {
      fragment.appendChild(createEventCard(event, index));
    });

    container.appendChild(fragment);

    section.hidden = false;
  } catch (error) {
    console.error(`Collection Error (${collection.endpoint}):`, error);

    section.hidden = true;
  }
};

const loadEventCollections = async () => {
  await Promise.all(featuredSections.map(loadCollection));
};

const performSearch = (value) => {
  searchQuery = value.trim();
  currentPage = 1;

  if (navbarSearchInput) {
    navbarSearchInput.value = searchQuery;
  }

  updateUrl();
  updateActiveFilters();
  loadEvents();

  document.getElementById("events-content")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
};

navbarSearchForm?.addEventListener("submit", (event) => {
  event.preventDefault();

  clearTimeout(searchTimeout);

  performSearch(navbarSearchInput?.value || "");
});

navbarSearchInput?.addEventListener("input", () => {
  clearTimeout(searchTimeout);

  searchTimeout = setTimeout(() => {
    performSearch(navbarSearchInput.value);
  }, 500);
});

categoryFilter?.addEventListener("change", () => {
  selectedCategory = categoryFilter.value;
  currentPage = 1;

  updateCategorySelection();
  updateUrl();
  loadEvents();
});

clearFiltersButton?.addEventListener("click", () => {
  searchQuery = "";
  selectedCategory = "";
  currentPage = 1;

  if (navbarSearchInput) {
    navbarSearchInput.value = "";
  }

  if (categoryFilter) {
    categoryFilter.value = "";
  }

  if (dateSort) {
    dateSort.value = "newest";
  }

  updateCategorySelection();
  updateUrl();
  loadEvents();
});

dateSort?.addEventListener("change", () => {
  currentPage = 1;
  loadEvents();
});

document.querySelectorAll(".rail-control").forEach((button) => {
  button.addEventListener("click", () => {
    const target = document.getElementById(button.dataset.target);

    if (!target) return;

    const direction = button.dataset.direction === "right" ? 1 : -1;

    const card = target.querySelector(".event-card");

    const cardWidth = card ? card.getBoundingClientRect().width : 340;

    const gap = 20;

    target.scrollBy({
      left: direction * (cardWidth + gap),
      behavior: "smooth",
    });
  });
});

const initializeEventsPage = async () => {
  updateUrl();

  await loadWishlist();

  await Promise.all([loadCategories(), loadEvents(), loadEventCollections()]);
};

initializeEventsPage();
