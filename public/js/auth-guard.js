function getToken() {
  return (
    localStorage.getItem("token") ||
    sessionStorage.getItem("token")
  );
}

function clearAuth() {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");
}

function getTokenPayload() {
  const token = getToken();

  if (!token) {
    return null;
  }

  try {
    return JSON.parse(
      atob(token.split(".")[1])
    );
  } catch (error) {
    return null;
  }
}

function isTokenExpired() {
  const payload = getTokenPayload();

  if (!payload || !payload.exp) {
    return true;
  }

  return Date.now() >= payload.exp * 1000;
}

function isLoggedIn() {
  const token = getToken();

  if (!token) {
    return false;
  }

  if (isTokenExpired()) {
    clearAuth();
    return false;
  }

  return true;
}

function getUserRole() {
  if (!isLoggedIn()) {
    return null;
  }

  const payload = getTokenPayload();

  return payload?.role || null;
}

function getDashboardUrl() {
  const role = getUserRole();

  if (role === "admin") {
    return "/admin/dashboard";
  }

  if (role === "host") {
    return "/host/dashboard";
  }

  return "/dashboard";
}

function redirectToDashboardIfLoggedIn() {
  if (!isLoggedIn()) {
    return false;
  }

  window.location.replace(
    getDashboardUrl()
  );

  return true;
}

function redirectToLoginIfNotLoggedIn() {
  if (!isLoggedIn()) {
    window.location.replace(
      "/login"
    );

    return true;
  }

  return false;
}

function logout() {
  clearAuth();

  window.location.replace(
    "/login"
  );
}

function handleBlockedAccount() {
  clearAuth();

  if (typeof showMessage === "function") {
    showMessage(
      "Your account has been blocked by the administrator.",
      "error"
    );
  }

  setTimeout(() => {
    window.location.replace(
      "/login"
    );
  }, 1000);
}

async function verifyAccountStatus() {
  const token = getToken();

  if (!token) {
    return false;
  }

  if (isTokenExpired()) {
    clearAuth();

    window.location.replace(
      "/login"
    );

    return false;
  }

  try {
    const response = await fetch(
      "/api/auth/status",
      {
        method: "GET",
        headers: {
          Authorization:
            `Bearer ${token}`
        }
      }
    );

    const data =
      await response.json();

    if (
      response.status === 403 &&
      data.blocked
    ) {
      handleBlockedAccount();
      return false;
    }

    if (
      response.status === 401
    ) {
      clearAuth();

      window.location.replace(
        "/login"
      );

      return false;
    }

    if (!response.ok) {
      return true;
    }

    return true;
  } catch (error) {
    console.error(
      "Account status check error:",
      error
    );

    return true;
  }
}

function setupLogout() {
  const logoutButtons =
    document.querySelectorAll(
      "#logoutBtn, .logout-btn, .logout"
    );

  logoutButtons.forEach(
    (button) => {
      if (
        button.dataset
          .logoutInitialized === "true"
      ) {
        return;
      }

      button.dataset
        .logoutInitialized = "true";

      button.addEventListener(
        "click",
        async (event) => {
          event.preventDefault();
          event.stopImmediatePropagation();

          let confirmed = true;

          if (
            typeof Swal !== "undefined"
          ) {
            const result =
              await Swal.fire({
                title: "Logout?",
                text:
                  "You will be signed out of your Eventure account.",
                icon: "question",
                showCancelButton: true,
                confirmButtonText:
                  "Logout",
                cancelButtonText:
                  "Cancel",
                confirmButtonColor:
                  "#6355e7",
                reverseButtons: true
              });

            confirmed =
              result.isConfirmed;
          } else {
            confirmed =
              window.confirm(
                "Are you sure you want to logout?"
              );
          }

          if (!confirmed) {
            return;
          }

          logout();
        }
      );
    }
  );
}

function protectAuthenticatedPage() {
  if (!isLoggedIn()) {
    window.location.replace(
      "/login"
    );

    return false;
  }

  verifyAccountStatus();

  window.addEventListener(
    "pageshow",
    async (event) => {
      if (!isLoggedIn()) {
        window.location.replace(
          "/login"
        );

        return;
      }

      if (event.persisted) {
        window.location.reload();

        return;
      }

      await verifyAccountStatus();
    }
  );

  return true;
}

function protectDashboardHistory() {
  if (!isLoggedIn()) {
    return;
  }

  history.pushState(
    { eventureDashboard: true },
    "",
    window.location.href
  );

  window.addEventListener(
    "popstate",
    () => {
      if (!isLoggedIn()) {
        window.location.replace(
          "/login"
        );

        return;
      }

      history.go(1);
    }
  );

  window.addEventListener(
    "pageshow",
    async (event) => {
      if (
        event.persisted &&
        !isLoggedIn()
      ) {
        window.location.replace(
          "/login"
        );

        return;
      }

      await verifyAccountStatus();
    }
  );
}

window.addEventListener(
  "pageshow",
  () => {
    const currentPath =
      window.location.pathname;

    if (
      currentPath ===
        "/login" ||
      currentPath ===
        "/register" ||
      currentPath ===
        "/forgot-password"
    ) {
      if (isLoggedIn()) {
        window.location.replace(
          getDashboardUrl()
        );
      }
    }
  }
);

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupLogout();
  }
);