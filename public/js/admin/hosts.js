const searchInput =
  document.getElementById("search");

const blockedFilter =
  document.getElementById("blockedFilter");

const verifiedFilter =
  document.getElementById("verifiedFilter");

const searchBtn =
  document.getElementById("searchBtn");

const clearBtn =
  document.getElementById("clearBtn");

const hostTable =
  document.getElementById("hostTable");

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


let allHosts = [];

let filteredHosts = [];

let currentPage = 1;

const limit = 5;

let totalPages = 1;


function getToken() {

  return (
    sessionStorage.getItem("token") ||
    localStorage.getItem("token")
  );

}


function debounce(callback, delay) {

  let timer;

  const debouncedFunction =
    function (...args) {

      clearTimeout(timer);

      timer = setTimeout(() => {

        callback.apply(
          this,
          args
        );

      }, delay);

    };


  debouncedFunction.cancel =
    () => {

      clearTimeout(timer);

    };


  return debouncedFunction;

}


const debouncedSearch =
  debounce(
    () => {

      currentPage = 1;

      loadHosts();

    },
    500
  );



async function loadHosts() {

  try {

    pageMessage.textContent =
      "";


    const token =
      getToken();


    if (!token) {

      return;

    }


    const params =
      new URLSearchParams();


    const search =
      searchInput.value.trim();

    const blocked =
      blockedFilter.value;

    const verified =
      verifiedFilter.value;


    if (search) {

      params.append(
        "search",
        search
      );

    }


    if (blocked !== "") {

      params.append(
        "blocked",
        blocked
      );

    }


    if (verified !== "") {

      params.append(
        "verified",
        verified
      );

    }


    const query =
      params.toString();


    const response =
      await fetch(
        `/api/admin/hosts${
          query
            ? `?${query}`
            : ""
        }`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          cache: "no-store",
        }
      );


    if (
      response.status === 401
    ) {

      if (
        window.adminAuth &&
        typeof window.adminAuth.logout ===
          "function"
      ) {

        window.adminAuth.logout();

      }

      return;

    }


    const data =
      await response.json();


    if (
      response.status === 403
    ) {

      throw new Error(
        data.message ||
        "You are not authorized to access hosts"
      );

    }


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Failed to load hosts"
      );

    }


    allHosts =
      data.hosts || [];


    filteredHosts =
      [...allHosts];


    currentPage = 1;


    renderHosts();

  } catch (error) {

    console.error(
      "Load hosts error:",
      error
    );


    hostTable.innerHTML =
      "";


    emptyState.style.display =
      "none";


    pageMessage.textContent =
      error.message;


    resultCount.textContent =
      "Unable to load hosts";


    totalPages = 1;

    currentPage = 1;


    pageInfo.textContent =
      "Page 1 of 1";


    previousBtn.disabled =
      true;


    nextBtn.disabled =
      true;

  }

}



function renderHosts() {

  hostTable.innerHTML =
    "";


  if (
    !filteredHosts ||
    filteredHosts.length === 0
  ) {

    emptyState.style.display =
      "block";


    resultCount.textContent =
      "No hosts found";


    totalPages = 1;


    pageInfo.textContent =
      "Page 1 of 1";


    previousBtn.disabled =
      true;


    nextBtn.disabled =
      true;


    return;

  }


  emptyState.style.display =
    "none";


  resultCount.textContent =
    `${filteredHosts.length} host${
      filteredHosts.length !== 1
        ? "s"
        : ""
    }`;


  totalPages =
    Math.ceil(
      filteredHosts.length / limit
    );


  if (
    currentPage > totalPages
  ) {

    currentPage =
      totalPages;

  }


  const startIndex =
    (currentPage - 1) * limit;


  const endIndex =
    startIndex + limit;


  const currentHosts =
    filteredHosts.slice(
      startIndex,
      endIndex
    );


  currentHosts.forEach(
    (host) => {

      const row =
        document.createElement("tr");


      const user =
        host.user || {};


      const hostName =
        user.name || "-";


      const hostEmail =
        user.email || "-";


      const organization =
        host.organizationName || "-";


      const organizationType =
        host.organizationType || "-";


      const verification =
        user.isVerified
          ? "Verified"
          : "Unverified";


      const accountStatus =
        user.isBlocked
          ? "Blocked"
          : "Active";


      const joined =
        user.created_at
          ? new Date(
              user.created_at
            ).toLocaleDateString()
          : "-";


      row.innerHTML = `

        <td>

          <div class="host-name">
            ${escapeHtml(hostName)}
          </div>

          <div class="host-email">
            ${escapeHtml(hostEmail)}
          </div>

        </td>


        <td>
          ${escapeHtml(organization)}
        </td>


        <td>
          ${escapeHtml(organizationType)}
        </td>


        <td>

          <span
            class="status-badge ${
              user.isVerified
                ? "status-verified"
                : "status-unverified"
            }"
          >
            ${verification}
          </span>

        </td>


        <td>

          <span
            class="status-badge ${
              user.isBlocked
                ? "status-blocked"
                : "status-active"
            }"
          >
            ${accountStatus}
          </span>

        </td>


        <td>
          ${joined}
        </td>


        <td>

          <a
            href="/admin/hosts/${host._id}"
            class="view-btn"
          >
            View
          </a>

        </td>

      `;


      hostTable.appendChild(
        row
      );

    }
  );


  updatePagination();

}



function updatePagination() {

  pageInfo.textContent =
    `Page ${currentPage} of ${totalPages}`;


  previousBtn.disabled =
    currentPage <= 1;


  nextBtn.disabled =
    currentPage >= totalPages;

}



searchBtn.addEventListener(
  "click",
  () => {

    debouncedSearch.cancel();

    currentPage = 1;

    loadHosts();

  }
);



clearBtn.addEventListener(
  "click",
  () => {

    debouncedSearch.cancel();

    searchInput.value =
      "";

    blockedFilter.value =
      "";

    verifiedFilter.value =
      "";

    currentPage = 1;

    loadHosts();

  }
);



searchInput.addEventListener(
  "input",
  () => {

    debouncedSearch();

  }
);



searchInput.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter"
    ) {

      event.preventDefault();

      debouncedSearch.cancel();

      currentPage = 1;

      loadHosts();

    }

  }
);



previousBtn.addEventListener(
  "click",
  () => {

    if (
      currentPage > 1
    ) {

      currentPage--;

      renderHosts();

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

      renderHosts();

    }

  }
);



function escapeHtml(value) {

  const div =
    document.createElement("div");


  div.textContent =
    value ?? "";


  return div.innerHTML;

}



loadHosts();