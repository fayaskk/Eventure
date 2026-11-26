document.addEventListener("DOMContentLoaded", () => {
  const walletBalance = document.getElementById("walletBalance");
  const totalCredits = document.getElementById("totalCredits");
  const totalDebits = document.getElementById("totalDebits");
  const totalTransactions = document.getElementById("totalTransactions");

  const transactionTableBody = document.getElementById("transactionTableBody");
  const mobileTransactions = document.getElementById("mobileTransactions");

  const transactionCount = document.getElementById("transactionCount");
  const paginationInfo = document.getElementById("paginationInfo");

  const prevPageButton = document.getElementById("prevPage");
  const nextPageButton = document.getElementById("nextPage");

  const filterButtons = document.querySelectorAll(".filter-btn");

  const API_URL = "/api/users/wallet";
  const LIMIT = 10;

  let currentPage = 1;
  let totalPages = 1;
  let currentFilter = "all";
  let allTransactions = [];

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token") ||
      sessionStorage.getItem("accessToken")
    );
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const escapeHTML = (value = "") => {
    return String(value).replace(/[&<>"']/g, (character) => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };

      return entities[character];
    });
  };

  const getTransactionDescription = (transaction) => {
    return (
      transaction.description ||
      transaction.reason?.replaceAll("_", " ") ||
      "Wallet transaction"
    );
  };

  const getReference = (transaction) => {
    if (!transaction.referenceId) return "—";

    return String(transaction.referenceId).slice(-10);
  };

  const renderLoading = () => {
    transactionTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="transaction-loading">
            <span class="loading-spinner"></span>
            Loading transactions...
          </div>
        </td>
      </tr>
    `;

    mobileTransactions.innerHTML = `
      <div class="transaction-loading">
        <span class="loading-spinner"></span>
        Loading transactions...
      </div>
    `;
  };

  const renderError = (message) => {
    transactionTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="transaction-error">
            <i class="fa-solid fa-circle-exclamation"></i>
            ${escapeHTML(message)}
          </div>
        </td>
      </tr>
    `;

    mobileTransactions.innerHTML = `
      <div class="transaction-error">
        <i class="fa-solid fa-circle-exclamation"></i>
        ${escapeHTML(message)}
      </div>
    `;
  };

  const renderEmpty = () => {
    transactionTableBody.innerHTML = `
      <tr>
        <td colspan="5">
          <div class="transaction-empty">
            <i class="fa-solid fa-wallet"></i>
            <strong>No transactions found</strong>
            <span>Your wallet activity will appear here.</span>
          </div>
        </td>
      </tr>
    `;

    mobileTransactions.innerHTML = `
      <div class="transaction-empty">
        <i class="fa-solid fa-wallet"></i>
        <strong>No transactions found</strong>
        <span>Your wallet activity will appear here.</span>
      </div>
    `;
  };

  const renderTransactions = (transactions) => {
    if (!transactions.length) {
      renderEmpty();
      return;
    }

    transactionTableBody.innerHTML = transactions
      .map((transaction) => {
        const type = transaction.type === "credit" ? "credit" : "debit";
        const amount = transaction.amountPaise / 100;

        const icon =
          type === "credit"
            ? "fa-arrow-down"
            : "fa-arrow-up";

        const sign = type === "credit" ? "+" : "-";

        return `
          <tr>
            <td>
              <div class="transaction-title">
                <span class="transaction-icon-small">
                  <i class="fa-solid ${icon}"></i>
                </span>
                <div>
                  <strong>${escapeHTML(getTransactionDescription(transaction))}</strong>
                  <small>${escapeHTML(transaction.reason || "Transaction")}</small>
                </div>
              </div>
            </td>

            <td>${escapeHTML(getReference(transaction))}</td>

            <td>${formatDate(transaction.created_at)}</td>

            <td>
              <span class="transaction-type ${type}">
                ${type === "credit" ? "Credit" : "Debit"}
              </span>
            </td>

            <td>
              <span class="transaction-amount ${type}">
                ${sign}${formatCurrency(amount)}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");

    mobileTransactions.innerHTML = transactions
      .map((transaction) => {
        const type = transaction.type === "credit" ? "credit" : "debit";
        const amount = transaction.amountPaise / 100;

        const icon =
          type === "credit"
            ? "fa-arrow-down"
            : "fa-arrow-up";

        const sign = type === "credit" ? "+" : "-";

        return `
          <article class="mobile-transaction-card">
            <div class="mobile-transaction-top">
              <div class="transaction-title">
                <span class="transaction-icon-small">
                  <i class="fa-solid ${icon}"></i>
                </span>

                <div>
                  <strong>${escapeHTML(getTransactionDescription(transaction))}</strong>
                  <small>${escapeHTML(transaction.reason || "Transaction")}</small>
                </div>
              </div>

              <span class="transaction-amount ${type}">
                ${sign}${formatCurrency(amount)}
              </span>
            </div>

            <div class="mobile-transaction-bottom">
              <span>${formatDate(transaction.created_at)}</span>
              <span>${type === "credit" ? "Credit" : "Debit"}</span>
            </div>
          </article>
        `;
      })
      .join("");
  };

  const updateStatistics = (transactions, pagination) => {
    const credits = transactions
      .filter((transaction) => transaction.type === "credit")
      .reduce((total, transaction) => total + transaction.amountPaise, 0);

    const debits = transactions
      .filter((transaction) => transaction.type === "debit")
      .reduce((total, transaction) => total + transaction.amountPaise, 0);

    totalCredits.textContent = formatCurrency(credits / 100);
    totalDebits.textContent = formatCurrency(debits / 100);

    totalTransactions.textContent = pagination.totalTransactions;
  };

  const updatePagination = (pagination) => {
    currentPage = pagination.currentPage;
    totalPages = pagination.totalPages || 1;

    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    transactionCount.textContent =
      `Showing ${allTransactions.length} of ${pagination.totalTransactions} transactions`;

    prevPageButton.disabled = currentPage <= 1;
    nextPageButton.disabled = currentPage >= totalPages;
  };

  const fetchWallet = async () => {
    const token = getToken();

    if (!token) {
      window.location.replace("/login");
      return;
    }

    renderLoading();

    try {
      const response = await fetch(
        `${API_URL}?page=${currentPage}&limit=${LIMIT}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          cache: "no-store",
        },
      );

      const data = await response.json();

      if (response.status === 401) {
        window.location.replace("/login");
        return;
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load wallet details");
      }

      const wallet = data.data.wallet;
      const transactions = data.data.transactions || [];
      const pagination = data.data.pagination;

      walletBalance.textContent = formatCurrency(wallet.balance);

      allTransactions = transactions;

      updateStatistics(transactions, pagination);
      updatePagination(pagination);

      const filteredTransactions =
        currentFilter === "all"
          ? transactions
          : transactions.filter(
              (transaction) => transaction.type === currentFilter,
            );

      renderTransactions(filteredTransactions);
    } catch (error) {
      console.error("Wallet fetch error:", error);
      renderError(error.message || "Something went wrong");
    }
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("active"));

      button.classList.add("active");

      currentFilter = button.dataset.filter;

      const filteredTransactions =
        currentFilter === "all"
          ? allTransactions
          : allTransactions.filter(
              (transaction) => transaction.type === currentFilter,
            );

      renderTransactions(filteredTransactions);
    });
  });

  prevPageButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      fetchWallet();
    }
  });

  nextPageButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      fetchWallet();
    }
  });

  fetchWallet();
});