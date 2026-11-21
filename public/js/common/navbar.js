document.addEventListener("DOMContentLoaded", () => {
  const profileLink = document.getElementById("navbarProfileLink");
  const profileWrapper = document.getElementById("navbarProfileWrapper");
  const profileTrigger = document.getElementById("navbarProfileTrigger");
  const profileName = document.getElementById("navbarProfileName");
  const dropdownUserName = document.getElementById("dropdownUserName");
  const avatar = document.getElementById("navbarAvatar");
  const authActions = document.getElementById("navbarAuthActions");

  const themeToggle = document.getElementById("themeToggle");

  const searchToggle = document.getElementById("navbarSearchToggle");
  const searchPanel = document.getElementById("navbarSearchPanel");
  const searchInput = document.getElementById("navbarSearchInput");
  const searchForm = document.getElementById("navbarSearchForm");

  const logoutButton = document.getElementById("navbarLogoutBtn");

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

  const setTheme = (theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("eventure-theme", theme);

    if (!themeToggle) return;

    const icon = themeToggle.querySelector("i");
    const isDark = theme === "dark";

    if (icon) {
      icon.className = isDark
        ? "bi bi-sun"
        : "bi bi-moon-stars";
    }

    themeToggle.setAttribute(
      "aria-label",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );

    themeToggle.setAttribute(
      "title",
      isDark ? "Switch to light mode" : "Switch to dark mode"
    );
  };

  const savedTheme = localStorage.getItem("eventure-theme");

  const preferredTheme =
    savedTheme ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light");

  setTheme(preferredTheme);

  themeToggle?.addEventListener("click", () => {
    const currentTheme =
      document.documentElement.getAttribute("data-theme");

    setTheme(currentTheme === "dark" ? "light" : "dark");
  });

  const closeProfileDropdown = () => {
    profileWrapper?.classList.remove("open");
    profileTrigger?.setAttribute("aria-expanded", "false");
  };

  const closeSearchPanel = () => {
    searchPanel?.classList.remove("open");
    searchToggle?.setAttribute("aria-expanded", "false");
  };

  const closeAllMenus = () => {
    closeProfileDropdown();
    closeSearchPanel();
  };

  profileTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();

    const isOpen = profileWrapper.classList.toggle("open");

    profileTrigger.setAttribute("aria-expanded", String(isOpen));

    closeSearchPanel();
  });

  searchToggle?.addEventListener("click", (event) => {
    event.stopPropagation();

    const isOpen = searchPanel.classList.toggle("open");

    searchToggle.setAttribute("aria-expanded", String(isOpen));

    closeProfileDropdown();

    if (isOpen) {
      setTimeout(() => searchInput?.focus(), 100);
    }
  });

  document.addEventListener("click", (event) => {
    if (
      profileWrapper &&
      !profileWrapper.contains(event.target)
    ) {
      closeProfileDropdown();
    }

    if (
      searchPanel &&
      !searchPanel.contains(event.target) &&
      !searchToggle?.contains(event.target)
    ) {
      closeSearchPanel();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllMenus();
    }
  });

  searchForm?.addEventListener("submit", (event) => {
    const query = searchInput?.value.trim();

    if (!query) {
      event.preventDefault();
      searchInput?.focus();
      return;
    }

    closeSearchPanel();
  });

  const setActiveLink = () => {
    const path =
      window.location.pathname.replace(/\/+$/, "") || "/";

    document.querySelectorAll("[data-nav-link]").forEach((link) => {
      const href = link.getAttribute("href")?.split("#")[0];

      const normalizedHref =
        href?.replace(/\/+$/, "") || "/";

      link.classList.toggle("active", normalizedHref === path);
    });
  };

  const applyRoleVisibility = (role) => {
    const normalizedRole = String(role || "user").toLowerCase();

    document.querySelectorAll("[data-role-link]").forEach((link) => {
      const allowedRoles = link.dataset.roleLink
        .split(",")
        .map((item) => item.trim().toLowerCase());

      link.classList.toggle(
        "hidden",
        !allowedRoles.includes(normalizedRole)
      );
    });
  };

  const showAuthenticatedNavigation = (payload) => {
    authActions?.classList.add("hidden");
    profileWrapper?.classList.remove("hidden");

    const name =
      payload.name ||
      payload.fullName ||
      payload.username ||
      "Account";

    const firstName = name.trim().split(/\s+/)[0] || "Account";

    if (profileName) {
      profileName.textContent = firstName;
    }

    if (dropdownUserName) {
      dropdownUserName.textContent = name;
    }

    if (avatar) {
      avatar.textContent = firstName.charAt(0).toUpperCase();
    }

    const role = payload.role || payload.userRole || "user";

    applyRoleVisibility(role);
  };

  const showPublicNavigation = () => {
    authActions?.classList.remove("hidden");
    profileWrapper?.classList.add("hidden");

    closeProfileDropdown();
  };

  const handleLogout = async () => {
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
        reverseButtons: true
      });

      confirmed = result.isConfirmed;
    }

    if (confirmed) {
      clearTokens();
      window.location.replace("/login");
    }
  };

  logoutButton?.addEventListener("click", handleLogout);

  const loadNavigation = async () => {
    const token = getToken();

    if (!token) {
      showPublicNavigation();
      return;
    }

    const payload = getPayload(token);

    if (!payload || !payload.exp || Date.now() >= payload.exp * 1000) {
      clearTokens();
      showPublicNavigation();
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

      if (
        response.status === 401 ||
        (response.status === 403 && data.blocked)
      ) {
        clearTokens();
        showPublicNavigation();

        if (
          response.status === 403 &&
          data.blocked &&
          typeof Swal !== "undefined"
        ) {
          await Swal.fire({
            icon: "error",
            title: "Account blocked",
            text: "Your account has been blocked by the administrator."
          });
        }

        return;
      }

      if (!response.ok) {
        showPublicNavigation();
        return;
      }

      const userData =
        data.user ||
        data.data?.user ||
        data.data ||
        payload;

      showAuthenticatedNavigation(userData);
    } catch (error) {
      console.error("Navbar authentication check failed:", error);
      showPublicNavigation();
    }
  };

  setActiveLink();
  loadNavigation();
});