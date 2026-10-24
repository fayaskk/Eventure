const getDashboardToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("accessToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("accessToken");

const escapeHtml = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const formatDate = (date) => {
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

const authenticatedFetch = async (url, options = {}) => {
  const token = getDashboardToken();

  if (!token) {
    window.location.replace("/login");
    throw new Error("Authentication required.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");

    window.location.replace("/login");
    throw new Error("Authentication required.");
  }

  if (response.status === 403) {
    const result = await response.json().catch(() => ({}));

    if (result.blocked) {
      localStorage.removeItem("token");
      localStorage.removeItem("accessToken");
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("accessToken");

      window.location.replace("/login");
      throw new Error("Your account has been blocked.");
    }
  }

  return response;
};

const loadUserProfile = async () => {
  const userName = document.getElementById("userName");

  if (!userName) return;

  try {
    const response = await authenticatedFetch("/api/users/profile");
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load profile.");
    }

    userName.textContent = result.data?.name || "there";
  } catch (error) {
    if (error.message !== "Authentication required.") {
      console.error("User profile error:", error);
      userName.textContent = "there";
    }
  }
};

let dashboardEvents = [];

const loadDashboardEvents = async () => {
  const container = document.getElementById("dashboardEvents");

  if (!container) return;

  container.innerHTML = `
    <div class="dashboard-empty-state">
      <p>Loading events...</p>
    </div>
  `;

  try {
    const response = await fetch("/api/events");
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load events.");
    }

    dashboardEvents = Array.isArray(result.events)
      ? result.events
      : Array.isArray(result.data)
        ? result.data
        : [];

    populateCategories();
    populateLocations();
    renderDashboardEvents();
  } catch (error) {
    console.error("Dashboard events error:", error);

    container.innerHTML = `
      <div class="dashboard-empty-state">
        <p>Unable to load events right now.</p>
        <a href="/events">Explore all events</a>
        <button type="button" id="retryDashboardEvents">Try Again</button>
      </div>
    `;

    document
      .getElementById("retryDashboardEvents")
      ?.addEventListener("click", loadDashboardEvents);
  }
};

const populateCategories = () => {
  const filter = document.getElementById("categoryFilter");

  if (!filter) return;

  const categories = new Set();

  dashboardEvents.forEach((event) => {
    if (event.category?.name) categories.add(event.category.name);
  });

  filter.innerHTML = `
    <option value="">All Categories</option>
    ${Array.from(categories)
      .sort((a, b) => a.localeCompare(b))
      .map(
        (category) => `
        <option value="${escapeHtml(category)}">${escapeHtml(category)}</option>
      `,
      )
      .join("")}
  `;
};

const populateLocations = () => {
  const filter = document.getElementById("locationFilter");

  if (!filter) return;

  const locations = new Set();

  dashboardEvents.forEach((event) => {
    const city = event.location?.city?.trim();

    if (city) locations.add(city);
  });

  filter.innerHTML = `
    <option value="">Any Location</option>
    ${Array.from(locations)
      .sort((a, b) => a.localeCompare(b))
      .map(
        (location) => `
        <option value="${escapeHtml(location)}">${escapeHtml(location)}</option>
      `,
      )
      .join("")}
  `;
};

const renderDashboardEvents = () => {
  const container = document.getElementById("dashboardEvents");

  if (!container) return;

  const searchText = (document.getElementById("eventSearch")?.value || "")
    .trim()
    .toLowerCase();

  const selectedCategory = (
    document.getElementById("categoryFilter")?.value || ""
  )
    .trim()
    .toLowerCase();

  const selectedLocation = (
    document.getElementById("locationFilter")?.value || ""
  )
    .trim()
    .toLowerCase();

  const filteredEvents = dashboardEvents.filter((event) => {
    const name = (event.eventName || "").toLowerCase();
    const description = (event.description || "").toLowerCase();
    const category = (event.category?.name || "").toLowerCase();
    const city = (event.location?.city || "").toLowerCase();

    return (
      (!searchText ||
        name.includes(searchText) ||
        description.includes(searchText) ||
        category.includes(searchText) ||
        city.includes(searchText)) &&
      (!selectedCategory || category === selectedCategory) &&
      (!selectedLocation || city === selectedLocation)
    );
  });

  if (!filteredEvents.length) {
    container.innerHTML = `
      <div class="dashboard-empty-state">
        <p>No events match your search.</p>
        <button type="button" id="clearEventFilters">Clear Filters</button>
      </div>
    `;

    document
      .getElementById("clearEventFilters")
      ?.addEventListener("click", () => {
        document.getElementById("eventSearch").value = "";
        document.getElementById("categoryFilter").value = "";
        document.getElementById("locationFilter").value = "";
        renderDashboardEvents();
      });

    return;
  }

  container.innerHTML = filteredEvents
    .slice(0, 6)
    .map((event) => {
      const category = event.category?.name || "Event";
      const city = event.location?.city || "Location unavailable";
      const banner = event.banner || "";

      return `
      <article class="event-card">
        <div class="event-image ${banner ? "" : "event-image-fallback"}">
          ${
            banner
              ? `<img src="${escapeHtml(banner)}" alt="${escapeHtml(event.eventName || "Event")}" onerror="this.style.display='none';this.parentElement.classList.add('event-image-fallback');">`
              : "🎟️"
          }
        </div>
        <div class="event-info">
          <span class="event-category">${escapeHtml(category)}</span>
          <h3>${escapeHtml(event.eventName || "Untitled Event")}</h3>
          <p>📍 ${escapeHtml(city)}</p>
          <p>📅 ${formatDate(event.eventDate)}</p>
          <a href="/events/${encodeURIComponent(event._id)}" class="book-btn">View Event</a>
        </div>
      </article>
    `;
    })
    .join("");
};

const setupEventSearch = () => {
  const searchInput = document.getElementById("eventSearch");
  const categoryFilter = document.getElementById("categoryFilter");
  const locationFilter = document.getElementById("locationFilter");
  const searchButton = document.getElementById("searchBtn");

  if (!searchInput || !categoryFilter || !locationFilter || !searchButton) {
    return;
  }

  let searchTimer;

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderDashboardEvents, 250);
  });

  categoryFilter.addEventListener("change", renderDashboardEvents);
  locationFilter.addEventListener("change", renderDashboardEvents);
  searchButton.addEventListener("click", renderDashboardEvents);

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      renderDashboardEvents();
    }
  });
};

document.addEventListener("DOMContentLoaded", async () => {
  const role = getTokenPayloadRole();

  if (role !== "user" && role !== "host") {
    window.location.replace(role === "admin" ? "/admin/dashboard" : "/login");
    return;
  }

  setupEventSearch();

  await Promise.all([loadUserProfile(), loadDashboardEvents()]);
});

function getTokenPayloadRole() {
  const token = getDashboardToken();

  if (!token) return null;

  try {
    let payload = token.split(".")[1];
    payload = payload.replace(/-/g, "+").replace(/_/g, "/");

    while (payload.length % 4) {
      payload += "=";
    }

    return JSON.parse(atob(payload)).role?.toLowerCase() || null;
  } catch {
    return null;
  }
}
