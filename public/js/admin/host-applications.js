const token =
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

const searchInput =
  document.getElementById("searchInput");

const statusFilter =
  document.getElementById("statusFilter");

const searchBtn =
  document.getElementById("searchBtn");

const clearBtn =
  document.getElementById("clearBtn");

const applicationTable =
  document.getElementById("applicationTable");

const resultCount =
  document.getElementById("resultCount");

const emptyState =
  document.getElementById("emptyState");

const previousBtn =
  document.getElementById("previousBtn");

const nextBtn =
  document.getElementById("nextBtn");

const pageInfo =
  document.getElementById("pageInfo");

const pageMessage =
  document.getElementById("pageMessage");

let currentPage = 1;

const limit = 5;

let totalPages = 1;

let searchTimeout;


async function loadApplications() {
  try {
    pageMessage.textContent = "";

    const status =
      statusFilter.value;

    const search =
      searchInput.value.trim();

    const params =
      new URLSearchParams({
        page: currentPage,
        limit: limit,
      });

    if (search) {
      params.append("search", search);
    }

    if (status) {
      params.append("status", status);
    }

    const response =
      await fetch(
        `/api/admin/hosts-applications?${params}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Failed to load host applications"
      );
    }

    renderApplications(
      data.applications
    );

    updatePagination(
      data.pagination
    );

  } catch (error) {
    console.error(
      "Load host applications error:",
      error
    );

    applicationTable.innerHTML = "";

    emptyState.style.display =
      "none";

    pageMessage.textContent =
      error.message;
  }
}


function renderApplications(
  applications
) {
  applicationTable.innerHTML = "";

  if (
    !applications ||
    applications.length === 0
  ) {
    emptyState.style.display =
      "block";

    resultCount.textContent =
      "No applications found";

    return;
  }

  emptyState.style.display =
    "none";

  resultCount.textContent =
    `${applications.length} application${
      applications.length !== 1
        ? "s"
        : ""
    }`;

  applications.forEach(
    (application) => {
      const row =
        document.createElement("tr");

      const applicantName =
        application.user?.name ||
        "-";

      const applicantEmail =
        application.user?.email ||
        "-";

      const organizationName =
        application.organizationName ||
        "-";

      const organizationType =
        application.organizationType ||
        "-";

      const status =
        application.verificationStatus ||
        "pending";

      const submitted =
        application.created_at
          ? new Date(
              application.created_at
            ).toLocaleDateString()
          : "-";

      row.innerHTML = `
        <td>
          <div class="applicant-name">
            ${applicantName}
          </div>

          <div class="applicant-email">
            ${applicantEmail}
          </div>
        </td>

        <td>
          ${organizationName}
        </td>

        <td>
          ${organizationType}
        </td>

        <td>
          <span
            class="status-badge status-${status}"
          >
            ${capitalize(status)}
          </span>
        </td>

        <td>
          ${submitted}
        </td>

        <td>
          <a
            href="/admin/host-applications/${application._id}"
            class="view-btn"
          >
            View
          </a>
        </td>
      `;

      applicationTable.appendChild(row);
    }
  );
}


function updatePagination(pagination) {
  currentPage =
    pagination.page;

  totalPages =
    pagination.totalPages;

  pageInfo.textContent =
    `Page ${currentPage} of ${totalPages}`;

  previousBtn.disabled =
    currentPage <= 1;

  nextBtn.disabled =
    currentPage >= totalPages;
}


function capitalize(value) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}


searchInput.addEventListener(
  "input",
  () => {
    clearTimeout(searchTimeout);

    searchTimeout =
      setTimeout(() => {
        currentPage = 1;
        loadApplications();
      }, 400);
  }
);


searchBtn.addEventListener(
  "click",
  () => {
    clearTimeout(searchTimeout);

    currentPage = 1;

    loadApplications();
  }
);


clearBtn.addEventListener(
  "click",
  () => {
    clearTimeout(searchTimeout);

    searchInput.value = "";

    statusFilter.value = "";

    currentPage = 1;

    loadApplications();
  }
);


statusFilter.addEventListener(
  "change",
  () => {
    clearTimeout(searchTimeout);

    currentPage = 1;

    loadApplications();
  }
);


previousBtn.addEventListener(
  "click",
  () => {
    if (currentPage > 1) {
      currentPage--;

      loadApplications();
    }
  }
);


nextBtn.addEventListener(
  "click",
  () => {
    if (
      currentPage < totalPages
    ) {
      currentPage++;

      loadApplications();
    }
  }
);


loadApplications();