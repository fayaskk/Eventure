const redirectedToLogin = redirectToLoginIfNotLoggedIn();

if (redirectedToLogin) {
  throw new Error("User is not logged in.");
}

function protectCurrentDashboardPage() {
  if (!isLoggedIn()) {
    return;
  }

  history.replaceState(
    {
      page: "dashboard",
      protected: true,
    },
    "",
    window.location.href,
  );
}

window.addEventListener("pageshow", () => {
  if (!isLoggedIn()) {
    window.location.replace("/login");
    return;
  }

  protectCurrentDashboardPage();
});

async function loadUserProfile() {
  const token = getToken();

  if (!token) {
    window.location.replace("/login");
    return;
  }

  const userName = document.getElementById("userName");

  if (!userName) {
    console.error("userName element not found");
    return;
  }

  try {
    const response = await fetch("/api/users/profile", {
      method: "GET",

      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    console.log("Profile response:", result);

    if (!response.ok || !result.success) {
      console.error("Failed to fetch user profile:", result.message);

      return;
    }

    const name = result.data?.name;

    if (name) {
      userName.textContent = name;
    } else {
      userName.textContent = "there";
    }
  } catch (error) {
    console.error("User dashboard name fetching error:", error);
  }
}

function setupEventSearch() {
  const searchInput = document.getElementById("eventSearch");

  const categoryFilter = document.getElementById("categoryFilter");

  const locationFilter = document.getElementById("locationFilter");

  const searchBtn = document.getElementById("searchBtn");

  if (!searchInput || !categoryFilter || !locationFilter || !searchBtn) {
    console.error("Search elements not found");

    return;
  }

  function searchEvents() {
    const searchText = searchInput.value.trim().toLowerCase();

    const selectedCategory = categoryFilter.value.trim().toLowerCase();

    const selectedLocation = locationFilter.value.trim().toLowerCase();

    const eventCards = document.querySelectorAll(".event-card");

    let visibleEvents = 0;

    eventCards.forEach((card) => {
      const eventName = (card.dataset.name || "").toLowerCase();

      const category = (card.dataset.category || "").toLowerCase();

      const location = (card.dataset.location || "").toLowerCase();

      const matchesSearch = !searchText || eventName.includes(searchText);

      const matchesCategory =
        selectedCategory === "all categories" || category === selectedCategory;

      const matchesLocation =
        selectedLocation === "any location" || location === selectedLocation;

      const shouldShow = matchesSearch && matchesCategory && matchesLocation;

      if (shouldShow) {
        card.style.display = "";

        visibleEvents++;
      } else {
        card.style.display = "none";
      }
    });

    console.log("Visible events:", visibleEvents);
  }

  let searchTimer;

  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);

    searchTimer = setTimeout(searchEvents, 300);
  });

  categoryFilter.addEventListener("change", searchEvents);

  locationFilter.addEventListener("change", searchEvents);

  searchBtn.addEventListener("click", searchEvents);

  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();

      searchEvents();
    }
  });
}

function setupMobileSidebar() {
  const sidebar = document.getElementById("sidebar");

  const overlay = document.getElementById("sidebarOverlay");

  const mobileMenuBtn = document.getElementById("mobileMenuBtn");

  const sidebarClose = document.getElementById("sidebarClose");

  if (!sidebar || !overlay || !mobileMenuBtn || !sidebarClose) {
    return;
  }

  function closeSidebar() {
    sidebar.classList.remove("open");

    overlay.classList.remove("active");

    document.body.classList.remove("sidebar-open");
  }

  mobileMenuBtn.addEventListener("click", () => {
    sidebar.classList.add("open");

    overlay.classList.add("active");

    document.body.classList.add("sidebar-open");
  });

  sidebarClose.addEventListener("click", closeSidebar);

  overlay.addEventListener("click", closeSidebar);

  sidebar.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeSidebar();
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  protectCurrentDashboardPage();

  loadUserProfile();

  setupEventSearch();

  setupMobileSidebar();
});