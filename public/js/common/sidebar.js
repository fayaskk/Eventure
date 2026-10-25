document.addEventListener("DOMContentLoaded", () => {
  const sidebar = document.getElementById("sidebar");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const sidebarClose = document.getElementById("sidebarClose");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const mainNavigation = document.getElementById("mainNavigation");
  const hostNavigation = document.getElementById("hostNavigation");
  const sidebarBottom = document.getElementById("sidebarBottom");

  const getToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken");

  const getPayload = () => {
    const token = getToken();

    if (!token) return null;

    try {
      let payload = token.split(".")[1];
      payload = payload.replace(/-/g, "+").replace(/_/g, "/");

      while (payload.length % 4) {
        payload += "=";
      }

      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  };

  const clearTokens = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");
    localStorage.removeItem("googleRememberMe");
    sessionStorage.removeItem("googleRememberMe");
  };

  const openSidebar = () => {
    sidebar?.classList.add("open");
    sidebarOverlay?.classList.add("active");
    document.body.classList.add("sidebar-open");
  };

  const closeSidebar = () => {
    sidebar?.classList.remove("open");
    sidebarOverlay?.classList.remove("active");
    document.body.classList.remove("sidebar-open");
  };

  mobileMenuBtn?.addEventListener("click", openSidebar);
  sidebarClose?.addEventListener("click", closeSidebar);
  sidebarOverlay?.addEventListener("click", closeSidebar);

  const currentPath = () => window.location.pathname.replace(/\/+$/, "") || "/";

  const setActiveNavigation = () => {
    const path = currentPath();

    document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
      const href = link.getAttribute("href");

      if (!href) return;

      const normalizedHref = href.replace(/\/+$/, "") || "/";

      const active =
        normalizedHref === path ||
        (normalizedHref === "/user/bookings" &&
          path.startsWith("/user/bookings/")) ||
        (normalizedHref === "/host/events" && path.startsWith("/host/events/"));

      link.classList.toggle("active", active);
    });
  };

  const setupNavigationEvents = () => {
    document.querySelectorAll(".sidebar .nav-link").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 900) {
          closeSidebar();
        }
      });
    });
  };

  const renderPublicNavigation = () => {
    mainNavigation.innerHTML = `
      <a href="/" class="nav-link">
        <span class="nav-icon">⌂</span>
        <span class="nav-text">Home</span>
      </a>
      <a href="/events" class="nav-link">
        <span class="nav-icon">◈</span>
        <span class="nav-text">Explore Events</span>
      </a>
      <a href="/login" class="nav-link">
        <span class="nav-icon">↪</span>
        <span class="nav-text">Login</span>
      </a>
      <a href="/register" class="nav-link">
        <span class="nav-icon">＋</span>
        <span class="nav-text">Create Account</span>
      </a>
    `;

    hostNavigation.innerHTML = "";
    hostNavigation.classList.remove("visible");
    sidebarBottom.innerHTML = "";

    setActiveNavigation();
    setupNavigationEvents();
  };

  const renderUserNavigation = () => {
    mainNavigation.innerHTML = `
      <a href="/dashboard" class="nav-link">
        <span class="nav-icon">⌂</span>
        <span class="nav-text">Dashboard</span>
      </a>
      <a href="/events" class="nav-link">
        <span class="nav-icon">◈</span>
        <span class="nav-text">Explore Events</span>
      </a>
      <a href="/user/bookings" class="nav-link">
        <span class="nav-icon">🎟</span>
        <span class="nav-text">My Tickets</span>
      </a>
      <a href="/profile" class="nav-link">
        <span class="nav-icon">♙</span>
        <span class="nav-text">My Profile</span>
      </a>
    `;

    hostNavigation.innerHTML = `
      <div class="nav-section-title">HOST</div>
      <a href="/apply-host" class="nav-link">
        <span class="nav-icon">▣</span>
        <span class="nav-text">Become a Host</span>
      </a>
    `;

    hostNavigation.classList.add("visible");
    renderLogout();
  };

  const renderHostNavigation = () => {
    mainNavigation.innerHTML = `
      <a href="/dashboard" class="nav-link">
        <span class="nav-icon">⌂</span>
        <span class="nav-text">User Dashboard</span>
      </a>
      <a href="/events" class="nav-link">
        <span class="nav-icon">◈</span>
        <span class="nav-text">Explore Events</span>
      </a>
      <a href="/user/bookings" class="nav-link">
        <span class="nav-icon">🎟</span>
        <span class="nav-text">My Tickets</span>
      </a>
      <a href="/profile" class="nav-link">
        <span class="nav-icon">♙</span>
        <span class="nav-text">My Profile</span>
      </a>
    `;

    hostNavigation.innerHTML = `
      <div class="nav-section-title">HOST</div>
      <a href="/host/dashboard" class="nav-link">
        <span class="nav-icon">▦</span>
        <span class="nav-text">Host Dashboard</span>
      </a>
      <a href="/host/events" class="nav-link">
        <span class="nav-icon">▤</span>
        <span class="nav-text">My Events</span>
      </a>
      <a href="/host/events/create" class="nav-link">
        <span class="nav-icon">＋</span>
        <span class="nav-text">Create Event</span>
      </a>
      <a href="/host/bookings" class="nav-link">
        <span class="nav-icon">🎟</span>
        <span class="nav-text">Bookings</span>
      </a>
      <a href="/host/settlements" class="nav-link">
        <span class="nav-icon">₹</span>
        <span class="nav-text">Settlements</span>
      </a>
      <a href="/host/profile" class="nav-link">
        <span class="nav-icon">●</span>
        <span class="nav-text">Host Profile</span>
      </a>
    `;

    hostNavigation.classList.add("visible");
    renderLogout();
  };

  const renderAdminNavigation = () => {
    mainNavigation.innerHTML = `
      <a href="/admin/dashboard" class="nav-link">
        <span class="nav-icon">⌂</span>
        <span class="nav-text">Dashboard</span>
      </a>
      <a href="/admin/profile" class="nav-link">
        <span class="nav-icon">♙</span>
        <span class="nav-text">My Profile</span>
      </a>
    `;

    hostNavigation.innerHTML = "";
    hostNavigation.classList.remove("visible");
    renderLogout();
  };

  const renderLogout = () => {
    sidebarBottom.innerHTML = `
      <button type="button" id="logoutBtn" class="logout-btn">
        <span class="nav-icon">↪</span>
        <span class="nav-text">Logout</span>
      </button>
    `;

    document
      .getElementById("logoutBtn")
      ?.addEventListener("click", async () => {
        let confirmed = true;

        if (typeof Swal !== "undefined") {
          const result = await Swal.fire({
            title: "Logout?",
            text: "Are you sure you want to logout?",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Logout",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#6355e7",
            reverseButtons: true,
          });

          confirmed = result.isConfirmed;
        }

        if (confirmed) {
          clearTokens();
          window.location.replace("/login");
        }
      });
  };

  const loadNavigation = async () => {
    const token = getToken();

    if (!token) {
      renderPublicNavigation();
      return;
    }

    const payload = getPayload();

    if (!payload || !payload.exp || Date.now() >= payload.exp * 1000) {
      clearTokens();
      renderPublicNavigation();
      return;
    }

    try {
      const response = await fetch("/api/auth/status", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        clearTokens();
        renderPublicNavigation();
        return;
      }

      if (response.status === 403 && data.blocked) {
        clearTokens();
        renderPublicNavigation();

        if (typeof Swal !== "undefined") {
          await Swal.fire({
            icon: "error",
            title: "Account blocked",
            text: "Your account has been blocked by the administrator.",
          });
        }

        return;
      }

      if (!response.ok) {
        console.error("Navigation authentication failed:", data);
        return;
      }

      const role = String(payload.role || "").toLowerCase();

      if (role === "host") {
        renderHostNavigation();
      } else if (role === "admin") {
        renderAdminNavigation();
      } else {
        renderUserNavigation();
      }

      setActiveNavigation();
      setupNavigationEvents();
    } catch (error) {
      console.error("Navigation loading failed:", error);
    }
  };

  setActiveNavigation();
  setupNavigationEvents();
  loadNavigation();
});
