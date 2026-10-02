const userTable = document.getElementById("userTable");
const searchInput = document.getElementById("search");
const blockedFilter = document.getElementById("blockedFilter");
const verifiedFilter = document.getElementById("verifiedFilter");
const searchBtn = document.getElementById("searchBtn");
const clearBtn = document.getElementById("clearBtn");
const previousBtn = document.getElementById("previousBtn");
const nextBtn = document.getElementById("nextBtn");
const pageInfo = document.getElementById("pageInfo");
const resultCount = document.getElementById("resultCount");
const emptyState = document.getElementById("emptyState");
const pageMessage = document.getElementById("pageMessage");

let currentPage = 1;
const limit = 8;
let totalPages = 1;
let debounceTimer;

function getToken() {
  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token")
  );
}

function redirectToLogin() {
  sessionStorage.removeItem("token");
  localStorage.removeItem("token");

  window.location.href = "/login";
}

async function loadUsers() {
  const token = getToken();

  if (!token) {
    redirectToLogin();
    return;
  }

  try {
    userTable.innerHTML = `
      <tr>
        <td colspan="6" class="loading">
          Loading users...
        </td>
      </tr>
    `;

    emptyState.style.display = "none";
    pageMessage.textContent = "";

    const params = new URLSearchParams();

    params.set("page", currentPage);
    params.set("limit", limit);

    const search = searchInput.value.trim();
    const isBlocked = blockedFilter.value;
    const isVerified = verifiedFilter.value;

    if (search) {
      params.set("search", search);
    }

    if (isBlocked !== "") {
      params.set("isBlocked", isBlocked);
    }

    if (isVerified !== "") {
      params.set("isVerified", isVerified);
    }

    const response = await fetch(
      `/api/admin/users?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const data = await response.json();

    if (response.status === 401) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to load users"
      );
    }

    const users = data.users || [];

    renderUsers(users);

    const pagination = data.pagination || {};

    totalPages = pagination.totalPages || 1;

    currentPage =
      pagination.page || currentPage;

    pageInfo.textContent =
      `Page ${currentPage} of ${totalPages}`;

    resultCount.textContent =
      `${pagination.totalUsers || 0} users found`;

    previousBtn.disabled =
      currentPage <= 1;

    nextBtn.disabled =
      currentPage >= totalPages;

  } catch (error) {
    console.error(
      "Load users error:",
      error
    );

    userTable.innerHTML = "";

    emptyState.style.display = "none";

    resultCount.textContent =
      "Unable to load users";

    pageMessage.textContent =
      error.message;
  }
}

function renderUsers(users) {
  userTable.innerHTML = "";

  if (!users.length) {
    emptyState.style.display = "block";
    return;
  }

  emptyState.style.display = "none";

  users.forEach((user) => {
    const row =
      document.createElement("tr");

    const verification = user.isVerified
      ? `
        <span class="badge verified">
          Verified
        </span>
      `
      : `
        <span class="badge unverified">
          Unverified
        </span>
      `;

    const status = user.isBlocked
      ? `
        <span class="badge blocked">
          Blocked
        </span>
      `
      : `
        <span class="badge active">
          Active
        </span>
      `;

    const joined = user.created_at
      ? new Date(
          user.created_at
        ).toLocaleDateString()
      : "-";

    const name =
      user.name || "Unknown User";

    const email =
      user.email || "-";

    const initial =
      name.charAt(0).toUpperCase();

    row.innerHTML = `
      <td>
        <div class="user-name">
          <div class="avatar">
            ${escapeHtml(initial)}
          </div>

          <strong>
            ${escapeHtml(name)}
          </strong>
        </div>
      </td>

      <td>
        ${escapeHtml(email)}
      </td>

      <td>
        ${verification}
      </td>

      <td>
        ${status}
      </td>

      <td>
        ${joined}
      </td>

      <td>
        <a
          href="/admin/users/${user._id}"
          class="view-btn"
        >
          View
        </a>
      </td>
    `;

    userTable.appendChild(row);
  });
}

function escapeHtml(value) {
  const div =
    document.createElement("div");

  div.textContent =
    value ?? "";

  return div.innerHTML;
}

function debounceSearch() {
  clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    currentPage = 1;
    loadUsers();
  }, 500);
}

searchInput.addEventListener(
  "input",
  debounceSearch
);

searchBtn.addEventListener(
  "click",
  () => {
    clearTimeout(debounceTimer);

    currentPage = 1;
    loadUsers();
  }
);

clearBtn.addEventListener(
  "click",
  () => {
    clearTimeout(debounceTimer);

    searchInput.value = "";
    blockedFilter.value = "";
    verifiedFilter.value = "";
    currentPage = 1;

    loadUsers();
  }
);

searchInput.addEventListener(
  "keydown",
  (event) => {
    if (event.key === "Enter") {
      clearTimeout(debounceTimer);

      currentPage = 1;
      loadUsers();
    }
  }
);

previousBtn.addEventListener(
  "click",
  () => {
    if (currentPage > 1) {
      currentPage--;
      loadUsers();
    }
  }
);

nextBtn.addEventListener(
  "click",
  () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadUsers();
    }
  }
);

loadUsers();