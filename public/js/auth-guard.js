function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken")
  );
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("accessToken");
}

function getTokenPayload() {
  const token = getToken();

  if (!token) return null;

  try {
    let payload = token.split(".")[1];

    if (!payload) return null;

    payload = payload.replace(/-/g, "+").replace(/_/g, "/");

    while (payload.length % 4) {
      payload += "=";
    }

    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

function isTokenExpired() {
  const payload = getTokenPayload();

  return (
    !payload ||
    typeof payload.exp !== "number" ||
    Date.now() >= payload.exp * 1000
  );
}

function isLoggedIn() {
  if (!getToken()) return false;

  if (isTokenExpired()) {
    clearAuth();
    return false;
  }

  return true;
}

function getUserRole() {
  return isLoggedIn() ? getTokenPayload()?.role || null : null;
}

function getDashboardUrl() {
  const role = getUserRole();

  if (role === "admin") return "/admin/dashboard";
  if (role === "host") return "/host/dashboard";

  return "/dashboard";
}

function redirectToDashboardIfLoggedIn() {
  if (!isLoggedIn()) return false;

  window.location.replace(getDashboardUrl());
  return true;
}

function redirectToLoginIfNotLoggedIn() {
  if (isLoggedIn()) return false;

  window.location.replace("/login");
  return true;
}

function logout() {
  clearAuth();
  window.location.replace("/login");
}

function handleBlockedAccount() {
  clearAuth();

  if (typeof Swal !== "undefined") {
    Swal.fire({
      icon: "error",
      title: "Account blocked",
      text: "Your account has been blocked by the administrator.",
    }).then(() => {
      window.location.replace("/login");
    });
  } else {
    window.location.replace("/login");
  }
}

async function verifyAccountStatus() {
  const token = getToken();

  if (!token || isTokenExpired()) {
    clearAuth();
    window.location.replace("/login");
    return false;
  }

  try {
    const response = await fetch("/api/auth/status", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 403 && data.blocked) {
      handleBlockedAccount();
      return false;
    }

    if (response.status === 401) {
      clearAuth();
      window.location.replace("/login");
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error("Account status check error:", error);
    return true;
  }
}

function setupLogout() {
  document
    .querySelectorAll("#logoutBtn, .logout-btn, .logout")
    .forEach((button) => {
      if (button.dataset.logoutInitialized === "true") return;

      button.dataset.logoutInitialized = "true";

      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        let confirmed = true;

        if (typeof Swal !== "undefined") {
          const result = await Swal.fire({
            title: "Logout?",
            text: "You will be signed out of your Eventure account.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Logout",
            cancelButtonText: "Cancel",
            confirmButtonColor: "#6355e7",
            reverseButtons: true,
          });

          confirmed = result.isConfirmed;
        }

        if (confirmed) logout();
      });
    });
}

function protectAuthenticatedPage() {
  if (!isLoggedIn()) {
    window.location.replace("/login");
    return false;
  }

  verifyAccountStatus();

  window.addEventListener("pageshow", async (event) => {
    if (!isLoggedIn()) {
      window.location.replace("/login");
      return;
    }

    if (event.persisted) {
      window.location.reload();
      return;
    }

    await verifyAccountStatus();
  });

  return true;
}

function protectDashboardHistory() {
  if (!isLoggedIn()) {
    window.location.replace("/login");
    return;
  }

  history.pushState({ eventureDashboard: true }, "", window.location.href);

  window.addEventListener("popstate", () => {
    if (!isLoggedIn()) {
      window.location.replace("/login");
      return;
    }

    history.go(1);
  });
}

window.addEventListener("pageshow", () => {
  const currentPath = window.location.pathname;

  if (
    currentPath === "/login" ||
    currentPath === "/register" ||
    currentPath === "/forgot-password"
  ) {
    if (isLoggedIn()) {
      window.location.replace(getDashboardUrl());
    }
  }
});

document.addEventListener("DOMContentLoaded", setupLogout);
