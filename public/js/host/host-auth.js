(function () {

  const LOGIN_PAGE = "/login";
  const DASHBOARD_PAGE = "/host/dashboard";

  function getToken() {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token")
    );
  }

  function getUserRole() {
    const token = getToken();

    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(
        atob(token.split(".")[1])
      );

      return payload.role || null;
    } catch (error) {
      return null;
    }
  }

  function protectPage() {
    const token = getToken();

    if (!token) {
      window.location.replace(LOGIN_PAGE);
      return false;
    }

    const role = getUserRole();

    if (role !== "host") {
      if (role === "admin") {
        window.location.replace(
          "/admin/dashboard"
        );
      } else {
        window.location.replace(
          "/dashboard"
        );
      }

      return false;
    }

    window.history.replaceState(
      {
        eventureHost: true
      },
      "",
      window.location.href
    );

    return true;
  }

  function logout() {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    localStorage.removeItem("googleRememberMe");

    window.location.replace(LOGIN_PAGE);
  }

  if (!protectPage()) {
    return;
  }

  window.hostAuth = {
    getToken,
    getUserRole,
    logout
  };

  window.addEventListener(
    "pageshow",
    function (event) {
      if (!getToken()) {
        window.location.replace(LOGIN_PAGE);
        return;
      }

      if (getUserRole() !== "host") {
        protectPage();
        return;
      }

      if (event.persisted) {
        window.location.replace(
          DASHBOARD_PAGE
        );
      }
    }
  );

  window.addEventListener(
    "popstate",
    function () {
      if (!getToken()) {
        window.location.replace(LOGIN_PAGE);
        return;
      }

      if (getUserRole() !== "host") {
        protectPage();
        return;
      }

      window.history.go(1);
    }
  );

  if (!protectPage()) {
    return;
  }

  setupLogout();

  window.hostAuth = {
    getToken,
    getUserRole,
    logout
  };

})();