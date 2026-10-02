document.addEventListener("DOMContentLoaded", () => {

  const sidebar =
    document.getElementById("sidebar");

  const mobileMenuBtn =
    document.getElementById("mobileMenuBtn");

  const sidebarClose =
    document.getElementById("sidebarClose");

  const sidebarOverlay =
    document.getElementById("sidebarOverlay");

  const hostNavigation =
    document.getElementById("hostNavigation");

  const logoutBtn =
    document.getElementById("logoutBtn");

  const openSidebar = () => {

    sidebar?.classList.add("open");

    sidebarOverlay?.classList.add("active");

    document.body.classList.add(
      "sidebar-open"
    );

  };

  const closeSidebar = () => {

    sidebar?.classList.remove("open");

    sidebarOverlay?.classList.remove("active");

    document.body.classList.remove(
      "sidebar-open"
    );

  };

  mobileMenuBtn?.addEventListener(
    "click",
    openSidebar
  );

  sidebarClose?.addEventListener(
    "click",
    closeSidebar
  );

  sidebarOverlay?.addEventListener(
    "click",
    closeSidebar
  );

  const getToken = () => {

    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );

  };

  const getCurrentPath = () => {

    return window.location.pathname.replace(
      /\/+$/,
      ""
    );

  };

  const setActiveNavigation = () => {

    const currentPath =
      getCurrentPath();

    document
      .querySelectorAll(".sidebar .nav-link")
      .forEach((link) => {

        const href =
          link.getAttribute("href");

        if (!href) {
          return;
        }

        const normalizedHref =
          href.replace(/\/+$/, "");

        link.classList.toggle(
          "active",
          normalizedHref === currentPath
        );

      });

  };

  const setupNavigationEvents = () => {

    document
      .querySelectorAll(".sidebar .nav-link")
      .forEach((link) => {

        link.addEventListener(
          "click",
          () => {

            if (window.innerWidth <= 900) {
              closeSidebar();
            }

          }
        );

      });

  };

  const loadAccountStatus = async () => {

    const token = getToken();

    if (!token || !hostNavigation) {
      return;
    }

    try {

      const response =
        await fetch(
          "/api/users/account-status",
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${token}`,

              "Content-Type":
                "application/json",
            },
          }
        );

      if (
        response.status === 401 ||
        response.status === 403
      ) {

        localStorage.removeItem("token");

        sessionStorage.removeItem("token");

        window.location.replace(
          "/login"
        );

        return;
      }

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {

        console.error(
          "Account status error:",
          data.message
        );

        renderDefaultHostNavigation();

        setActiveNavigation();

        setupNavigationEvents();

        return;
      }

      renderHostNavigation(data);

      setActiveNavigation();

      setupNavigationEvents();

    } catch (error) {

      console.error(
        "Failed to load account status:",
        error
      );

      renderDefaultHostNavigation();

      setActiveNavigation();

      setupNavigationEvents();

    }

  };

  const renderDefaultHostNavigation = () => {

    if (!hostNavigation) {
      return;
    }

    hostNavigation.innerHTML = `

      <div class="nav-section-title">
        HOST
      </div>

      <a
        href="/apply-host"
        class="nav-link"
      >

        <span class="nav-icon">
          ▣
        </span>

        <span class="nav-text">
          Become a Host
        </span>

      </a>

    `;

    hostNavigation.classList.add(
      "visible"
    );

  };

  const renderHostNavigation = (data) => {

    if (!hostNavigation) {
      return;
    }

    const role =
      String(
        data.account?.role || "user"
      ).toLowerCase();

    const application =
      data.hostApplication || null;

    const applicationStatus =
      String(
        application?.status || ""
      ).toLowerCase();

    if (role === "host") {

      hostNavigation.innerHTML = `

        <div class="nav-section-title">
          HOST
        </div>

        <a
          href="/host/dashboard"
          class="nav-link"
        >

          <span class="nav-icon">
            ▦
          </span>

          <span class="nav-text">
            Host Dashboard
          </span>

        </a>

        <a
          href="/host/events"
          class="nav-link"
        >

          <span class="nav-icon">
            ▤
          </span>

          <span class="nav-text">
            My Events
          </span>

        </a>

        <a
          href="/host/events/create"
          class="nav-link"
        >

          <span class="nav-icon">
            ＋
          </span>

          <span class="nav-text">
            Create Event
          </span>

        </a>

        <a
          href="/host/bookings"
          class="nav-link"
        >

          <span class="nav-icon">
            🎟
          </span>

          <span class="nav-text">
            Bookings
          </span>

        </a>

        <a
          href="/host/settlements"
          class="nav-link"
        >

          <span class="nav-icon">
            ₹
          </span>

          <span class="nav-text">
            Settlements
          </span>

        </a>

        <a
          href="/host/profile"
          class="nav-link"
        >

          <span class="nav-icon">
            ●
          </span>

          <span class="nav-text">
            Host Profile
          </span>

        </a>

      `;

      hostNavigation.classList.add(
        "visible"
      );

      return;
    }

    if (applicationStatus === "pending") {

      hostNavigation.innerHTML = `

        <div class="nav-section-title">
          HOST
        </div>

        <a
          href="/apply-host"
          class="nav-link"
        >

          <span class="nav-icon">
            ▣
          </span>

          <span class="nav-text">
            Become a Host
          </span>

          <span class="nav-status pending">
            Pending
          </span>

        </a>

      `;

      hostNavigation.classList.add(
        "visible"
      );

      return;
    }

    if (applicationStatus === "rejected") {

      hostNavigation.innerHTML = `

        <div class="nav-section-title">
          HOST
        </div>

        <a
          href="/apply-host"
          class="nav-link"
        >

          <span class="nav-icon">
            ▣
          </span>

          <span class="nav-text">
            Become a Host
          </span>

          <span class="nav-status rejected">
            Rejected
          </span>

        </a>

      `;

      hostNavigation.classList.add(
        "visible"
      );

      return;
    }

    renderDefaultHostNavigation();

  };

  logoutBtn?.addEventListener(
    "click",
    async (event) => {

      event.preventDefault();

      const result =
        await Swal.fire({

          title: "Logout?",

          text:
            "Are you sure you want to logout?",

          icon: "question",

          showCancelButton: true,

          confirmButtonText:
            "Logout",

          cancelButtonText:
            "Cancel",

          reverseButtons: true,

        });

      if (!result.isConfirmed) {
        return;
      }

      const token = getToken();

      try {

        if (token) {

          await fetch(
            "/api/users/logout",
            {
              method: "POST",

              headers: {
                Authorization:
                  `Bearer ${token}`,

                "Content-Type":
                  "application/json",
              },
            }
          );

        }

      } catch (error) {

        console.error(
          "Logout request failed:",
          error
        );

      } finally {

        localStorage.removeItem(
          "token"
        );

        sessionStorage.removeItem(
          "token"
        );

        localStorage.removeItem(
          "googleRememberMe"
        );

        window.location.replace(
          "/login"
        );

      }

    }
  );

  setActiveNavigation();

  setupNavigationEvents();

  loadAccountStatus();

});