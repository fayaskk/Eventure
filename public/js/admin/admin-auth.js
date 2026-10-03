(function () {
  const LOGIN_PAGE = "/login";

  function getToken() {
    return (
      sessionStorage.getItem("token") ||
      localStorage.getItem("token")
    );
  }

  function clearToken() {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");
  }

  function decodeToken(token) {
    try {
      const payload = token.split(".")[1];

      if (!payload) {
        return null;
      }

      const normalizedPayload = payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

      const decodedPayload = atob(
        normalizedPayload
      );

      return JSON.parse(decodedPayload);
    } catch (error) {
      return null;
    }
  }

  function isValidAdminToken(token) {
    if (!token) {
      return false;
    }

    const payload =
      decodeToken(token);

    if (!payload) {
      return false;
    }

    if (payload.role !== "admin") {
      return false;
    }

    if (
      payload.exp &&
      Date.now() >= payload.exp * 1000
    ) {
      return false;
    }

    return true;
  }

  function logout() {
    clearToken();

    window.location.replace(
      LOGIN_PAGE
    );
  }

  function protectPage() {
    const token = getToken();

    if (!isValidAdminToken(token)) {
      clearToken();

      window.location.replace(
        LOGIN_PAGE
      );

      return false;
    }

    return true;
  }

  function setupLogout() {
    const logoutButtons =
      document.querySelectorAll(
        ".logout, #logoutBtn"
      );

    logoutButtons.forEach(
      (logoutBtn) => {
        logoutBtn.addEventListener(
          "click",
          async function (event) {
            event.preventDefault();

            const result =
              await Swal.fire({
                title: "Logout?",
                text: "Are you sure you want to logout?",
                icon: "question",
                showCancelButton: true,
                confirmButtonText: "Logout",
                cancelButtonText: "Cancel",
                reverseButtons: true
              });

            if (!result.isConfirmed) {
              return;
            }

            logout();
          }
        );
      }
    );
  }

  window.addEventListener(
    "pageshow",
    function () {
      if (!protectPage()) {
        return;
      }
    }
  );

  if (!protectPage()) {
    return;
  }

  setupLogout();

  window.adminAuth = {
    getToken,
    logout,
    isValidAdminToken
  };
})();