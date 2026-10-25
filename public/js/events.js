const eventContainer = document.getElementById("events-container");
const eventCount = document.getElementById("event-count");
const searchInput = document.getElementById("event-search");
const searchButton = document.getElementById("search-btn");
const categoriesContainer = document.getElementById("categories-container");
const dateSort = document.getElementById("date-sort");
const priceSort = document.getElementById("price-sort");
const eventsSectionTitle = document.getElementById("events-section-title");
const categoryScrollLeft = document.getElementById("category-scroll-left");
const categoryScrollRight = document.getElementById("category-scroll-right");

let selectedCategory = "";
let searchQuery = "";
let categories = [];

const loadEvents = async () => {
  try {
    eventContainer.innerHTML = `
      <div class="events-loading">Loading events...</div>
    `;

    const params = new URLSearchParams();

    if (searchQuery) {
      params.set("search", searchQuery);
    }

    if (selectedCategory) {
      params.set("category", selectedCategory);
    }

    const selectedPriceSort = priceSort?.value || "";
    const selectedDateSort = dateSort?.value || "newest";

    params.set("sort", selectedPriceSort || selectedDateSort);

    const response = await fetch(`/api/events?${params.toString()}`);
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch events.");
    }

    const events = result.events || [];

    eventCount.textContent = `${result.pagination?.totalEvents ?? events.length} event(s) available`;

    if (events.length === 0) {
      eventContainer.innerHTML = `
        <div class="events-empty">
          No events match your search. Try another keyword or category.
        </div>
      `;
      return;
    }

    eventContainer.innerHTML = "";

    events.forEach((event) => {
      const card = document.createElement("article");
      card.className = "event-card";

      const imageWrapper = document.createElement("div");
      imageWrapper.className = "event-card-image-wrapper";

      const image = document.createElement("img");
      image.src = event.banner || "";
      image.alt = event.eventName || "Event banner";
      image.className = "event-card-image";
      image.loading = "lazy";

      image.addEventListener(
        "error",
        () => {
          imageWrapper.classList.add("event-image-unavailable");
          image.removeAttribute("src");
          image.alt = "Event banner unavailable";
        },
        { once: true },
      );

      imageWrapper.appendChild(image);

      const content = document.createElement("div");
      content.className = "event-card-content";

      const category = document.createElement("span");
      category.className = "event-category";
      category.textContent = event.category?.name || "Event";

      const title = document.createElement("h3");
      title.textContent = event.eventName || "Untitled Event";

      const description = document.createElement("p");
      description.className = "event-description";
      description.textContent = event.description || "";

      const location = document.createElement("span");
      location.className = "event-location";
      location.textContent = `📍 ${event.location?.city || "Location unavailable"}`;

      const date = document.createElement("span");
      date.className = "event-date";
      date.textContent = `📅 ${formatEventDate(event.eventDate)}`;

      const footer = document.createElement("div");
      footer.className = "event-card-footer";

      const status = document.createElement("span");
      status.className = "event-status";
      status.textContent = event.status || "Available";

      const link = document.createElement("a");
      link.href = `/events/${event._id}`;
      link.className = "view-event-btn";
      link.textContent = "View Event";

      footer.append(status, link);
      content.append(category, title, description, location, date, footer);
      card.append(imageWrapper, content);

      eventContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Events Page Error:", error);

    eventContainer.innerHTML = `
      <div class="events-error">
        Failed to load events. Please try again later.
      </div>
    `;

    eventCount.textContent = "Unable to load events";
  }
};

const loadCategories = async () => {
  try {
    categoriesContainer.innerHTML = `
      <div class="categories-loading">Loading categories...</div>
    `;

    const response = await fetch("/api/categories");
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch categories.");
    }

    categories = result.categories || result.data || [];

    renderCategories();
  } catch (error) {
    console.error("Categories Page Error:", error);

    categoriesContainer.innerHTML = `
      <div class="categories-error">
        Failed to load categories.
      </div>
    `;
  }
};

const renderCategories = () => {
  categoriesContainer.innerHTML = "";

  const allButton = document.createElement("button");
  allButton.type = "button";
  allButton.className = `category-card ${selectedCategory === "" ? "active" : ""}`;

  const allIcon = document.createElement("span");
  allIcon.className = "category-icon";
  allIcon.textContent = "✦";

  const allName = document.createElement("span");
  allName.className = "category-name";
  allName.textContent = "All Categories";

  allButton.append(allIcon, allName);

  allButton.addEventListener("click", () => {
    selectedCategory = "";
    updateCategorySelection();
    loadEvents();
  });

  categoriesContainer.appendChild(allButton);

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `category-card ${selectedCategory === category.slug ? "active" : ""}`;

    const icon = document.createElement("span");
    icon.className = "category-icon";
    icon.textContent = getCategoryIcon(category.name);

    const name = document.createElement("span");
    name.className = "category-name";
    name.textContent = category.name;

    button.append(icon, name);

    button.addEventListener("click", () => {
      selectedCategory = category.slug;
      updateCategorySelection();
      loadEvents();
    });

    categoriesContainer.appendChild(button);
  });
};

const updateCategorySelection = () => {
  renderCategories();

  const selected = categories.find(
    (category) => category.slug === selectedCategory,
  );

  eventsSectionTitle.textContent = selected
    ? `${selected.name} Events`
    : "All Events";
};

const getCategoryIcon = (name = "") => {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("music")) return "♫";
  if (normalizedName.includes("sport")) return "⚽";
  if (normalizedName.includes("tech")) return "💻";
  if (normalizedName.includes("business")) return "💼";
  if (normalizedName.includes("health") || normalizedName.includes("medical"))
    return "✚";
  if (normalizedName.includes("art")) return "🎨";
  if (normalizedName.includes("food")) return "🍽";
  if (normalizedName.includes("education")) return "📚";
  if (normalizedName.includes("travel")) return "✈";

  return "✦";
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

searchButton?.addEventListener("click", () => {
  searchQuery = searchInput.value.trim();
  loadEvents();
});

searchInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchQuery = searchInput.value.trim();
    loadEvents();
  }
});

dateSort?.addEventListener("change", () => {
  if (priceSort) {
    priceSort.value = "";
  }

  loadEvents();
});

priceSort?.addEventListener("change", () => {
  if (priceSort.value && dateSort) {
    dateSort.value = "newest";
  }

  loadEvents();
});

categoryScrollLeft?.addEventListener("click", () => {
  categoriesContainer.scrollBy({
    left: -300,
    behavior: "smooth",
  });
});

categoryScrollRight?.addEventListener("click", () => {
  categoriesContainer.scrollBy({
    left: 300,
    behavior: "smooth",
  });
});

const initializeEventsPage = async () => {
  await Promise.all([loadCategories(), loadEvents()]);
};

initializeEventsPage();
