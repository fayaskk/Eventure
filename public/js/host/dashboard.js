const getHostDashboardToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken")
  );
};

const hostAuthenticatedFetch = async (url, options = {}) => {
  const token = getHostDashboardToken();

  if (!token) {
    window.location.replace("/login");
    throw new Error("Authentication token not found.");
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
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

    throw new Error(result.message || "Access forbidden.");
  }

  return response;
};

const loadHostDashboardProfile = async () => {
  const hostName = document.getElementById("hostName");

  if (!hostName) {
    return;
  }

  try {
    const response = await hostAuthenticatedFetch("/api/host/profile");
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to load host profile.");
    }

    const profile = result.profile;

    hostName.textContent = profile?.name || "Host";
  } catch (error) {
    console.error("Host dashboard profile error:", error);
  }
};

document.addEventListener("DOMContentLoaded", () => {
  loadHostDashboardProfile();
});
