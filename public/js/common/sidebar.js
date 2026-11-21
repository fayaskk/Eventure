document.addEventListener("DOMContentLoaded", () => {
  if (window.eventureSidebarInitialized) return;
window.eventureSidebarInitialized = true;
  const sidebar = document.getElementById("sidebar");
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  const sidebarClose = document.getElementById("sidebarClose");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const mainNavigation = document.getElementById("mainNavigation");
  const hostNavigation = document.getElementById("hostNavigation");

  if (!sidebar || !mainNavigation || !hostNavigation) return;

  let resizeTimer;
  let navigationReady = false;

  const getToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken");

  const getPayload = (token) => {
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

  const applyRoleLayout = (role) => {
    document.body.classList.toggle("host-layout", role === "host");
  };

  const openSidebar = () => {
    if (window.innerWidth > 900) return;

    sidebar.classList.add("open");
    sidebarOverlay?.classList.add("active");
    document.body.classList.add("sidebar-open");
    mobileMenuBtn?.setAttribute("aria-expanded", "true");
    sidebarClose?.focus();
  };

  const closeSidebar = () => {
    sidebar.classList.remove("open");
    sidebarOverlay?.classList.remove("active");
    document.body.classList.remove("sidebar-open");
    mobileMenuBtn?.setAttribute("aria-expanded", "false");
  };

  mobileMenuBtn?.addEventListener("click", openSidebar);
  sidebarClose?.addEventListener("click", closeSidebar);
  sidebarOverlay?.addEventListener("click", closeSidebar);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSidebar();
    }
  });

  const currentPath = () =>
    window.location.pathname.replace(/\/+$/, "") || "/";

  const isLinkActive = (link) => {
    const href = link.getAttribute("href");

    if (!href) return false;

    const normalizedHref = href.replace(/\/+$/, "") || "/";
    const path = currentPath();

return (
  normalizedHref === path ||
  (normalizedHref === "/user/bookings" &&
    path.startsWith("/user/bookings/"))
);
  };

  const getNavigationGroup = (link) =>
    link?.closest(".nav-group, .host-navigation");

  const createIndicator = (group) => {
    if (!group) return null;

    let indicator = group.querySelector(".nav-active-indicator");

    if (!indicator) {
      indicator = document.createElement("span");
      indicator.className = "nav-active-indicator";
      indicator.setAttribute("aria-hidden", "true");
      group.prepend(indicator);
    }

    return indicator;
  };

  const positionIndicator = (group, link, instant = false) => {
    if (!group || !link) return;

    const indicator = createIndicator(group);

    if (!indicator) return;

    const groupRect = group.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    const top = linkRect.top - groupRect.top + group.scrollTop;

    if (instant) {
      indicator.classList.add("no-transition");
    }

    indicator.style.height = `${linkRect.height}px`;
    indicator.style.transform = `translate3d(0, ${top}px, 0)`;
    indicator.classList.add("is-visible");

    if (instant) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          indicator.classList.remove("no-transition");
        });
      });
    }
  };

  const setActiveNavigation = (instant = false) => {
    const links = document.querySelectorAll(".sidebar .nav-link");
    let activeLink = null;

    links.forEach((link) => {
      const active = isLinkActive(link);

      link.classList.toggle("active", active);

      if (active) {
        activeLink = link;
      }
    });

    document
      .querySelectorAll(".sidebar .nav-active-indicator")
      .forEach((indicator) => {
        if (indicator.parentElement !== getNavigationGroup(activeLink)) {
          indicator.classList.remove("is-visible");
        }
      });

    if (!activeLink) return;

    const group = getNavigationGroup(activeLink);

    requestAnimationFrame(() => {
      positionIndicator(group, activeLink, instant);
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

  const finishNavigation = () => {
    setActiveNavigation(true);
    setupNavigationEvents();
    navigationReady = true;
  };

  const renderPublicNavigation = () => {
    applyRoleLayout("public");

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

    finishNavigation();
  };

  const renderUserNavigation = () => {
    applyRoleLayout("user");

    mainNavigation.innerHTML = `
      <a href="/events" class="nav-link">
        <span class="nav-icon">◈</span>
        <span class="nav-text">Explore Events</span>
      </a>
      <a href="/user/bookings" class="nav-link">
        <span class="nav-icon">🎟</span>
        <span class="nav-text">My Tickets</span>
      </a>
      <a href="/user/attended-events" class="nav-link">
        <span class="nav-icon">★</span>
        <span class="nav-text">Attended Events</span>
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

    finishNavigation();
  };

  const renderHostNavigation = () => {
    applyRoleLayout("host");

    mainNavigation.innerHTML = `
      <a href="/host/dashboard" class="nav-link">
        <span class="nav-icon">▦</span>
        <span class="nav-text">Host Dashboard</span>
      </a>
      <a href="/host/events" class="nav-link">
        <span class="nav-icon">▤</span>
        <span class="nav-text">My Events</span>
      </a>
      <a href="/host/feedback" class="nav-link">
        <span class="nav-icon">⭐</span>
        <span class="nav-text">Feedback & Reviews</span>
      </a>
      <a href="/host/events/create" class="nav-link">
        <span class="nav-icon">＋</span>
        <span class="nav-text">Create Event</span>
      </a>
      <a href="/host/bookings" class="nav-link">
        <span class="nav-icon">🎟</span>
        <span class="nav-text">Bookings</span>
      </a>
      <a href="/host/ticket-scanner" class="nav-link">
        <span class="nav-icon">▣</span>
        <span class="nav-text">QR Scanner</span>
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

    hostNavigation.innerHTML = "";
    hostNavigation.classList.remove("visible");

    finishNavigation();
  };

  const renderAdminNavigation = () => {
    applyRoleLayout("admin");

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

    finishNavigation();
  };

  const loadNavigation = async () => {
    const token = getToken();

    if (!token) {
      renderPublicNavigation();
      return;
    }

    const payload = getPayload(token);

    if (!payload || !payload.exp || Date.now() >= payload.exp * 1000) {
      clearTokens();
      renderPublicNavigation();
      return;
    }

    try {
      const response = await fetch("/api/auth/status", {
        headers: {
          Authorization: `Bearer ${token}`
        },
        cache: "no-store"
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
            text: "Your account has been blocked by the administrator."
          });
        }

        return;
      }

      if (!response.ok) {
        console.error("Navigation authentication failed:", data);
        renderPublicNavigation();
        return;
      }

      const userData = data.user || data.data?.user || data.data || payload;

      const role = String(
        userData.role || userData.userRole || payload.role || ""
      ).toLowerCase();

      if (role === "host") {
        renderHostNavigation();
      } else if (role === "admin") {
        renderAdminNavigation();
      } else {
        renderUserNavigation();
      }
    } catch (error) {
      console.error("Navigation loading failed:", error);
      renderPublicNavigation();
    }
  };

  window.addEventListener("resize", () => {
    if (window.innerWidth > 900) {
      closeSidebar();
    }

    if (!navigationReady) return;

    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(() => {
      setActiveNavigation(true);
    }, 120);
  });

  loadNavigation();
});