const token =
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

const logoutBtn =
  document.getElementById("logoutBtn");

async function loadDashboardStats() {
  try {
    const response = await fetch(
      "/api/admin/dashboard/stats",
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to load dashboard"
      );
    }

    const stats = data.data;

    document.getElementById("totalUsers").textContent =
      stats.totalUsers;

    document.getElementById("verifiedHosts").textContent =
      stats.verifiedHosts;

    document.getElementById("activeEvents").textContent =
      stats.activeEvents;

    document.getElementById("totalBookings").textContent =
      stats.totalBookings;

    document.getElementById("totalRevenue").textContent =
      `₹${stats.totalRevenue}`;

    document.getElementById("pendingApplications").textContent =
      stats.pendingApplications;

  } catch (error) {
    console.error(
      "Dashboard error:",
      error
    );
  }
}

loadDashboardStats();