document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "/api/users/transactions";
  const LIMIT = 10;

  const tableBody = document.getElementById("historyTableBody");
  const mobileList = document.getElementById("historyMobileList");

  const filterSelect = document.getElementById("transactionFilter");

  const totalPayments = document.getElementById("totalPayments");
  const totalRefunds = document.getElementById("totalRefunds");
  const totalCredits = document.getElementById("totalCredits");
  const totalTransactions = document.getElementById("totalTransactions");

  const historyCount = document.getElementById("historyCount");
  const paginationInfo = document.getElementById("historyPaginationInfo");

  const previousButton = document.getElementById("historyPrevPage");
  const nextButton = document.getElementById("historyNextPage");

  let currentPage = 1;
  let totalPages = 1;
  let currentFilter = "all";

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      sessionStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("accessToken")
    );
  };

  const escapeHTML = (value) => {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
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

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount) || 0);
  };

  const formatDate = (date) => {
    if (!date) return "Date unavailable";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Date unavailable";
    }

    return parsedDate.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionDetails = (transaction) => {
    const details = {
      payment: {
        title: "Ticket Payment",
        icon: "fa-credit-card",
        className: "payment",
        sign: "-",
        amountClass: "negative",
      },
      credit: {
        title: "Wallet Credit",
        icon: "fa-arrow-down",
        className: "credit",
        sign: "+",
        amountClass: "positive",
      },
      debit: {
        title: "Wallet Debit",
        icon: "fa-arrow-up",
        className: "debit",
        sign: "-",
        amountClass: "negative",
      },
      refund: {
        title: "Ticket Refund",
        icon: "fa-arrow-rotate-left",
        className: "refund",
        sign: "+",
        amountClass: "positive",
      },
    };

    return (
      details[transaction.type] || {
        title: "Transaction",
        icon: "fa-receipt",
        className: "payment",
        sign: "",
        amountClass: "neutral",
      }
    );
  };

  const getReference = (transaction) => {
    const reference = transaction.reference || {};

    return (
      reference.bookingReference ||
      reference.referenceId ||
      reference.ticketId ||
      reference.bookingId ||
      reference.referenceType ||
      transaction.id ||
      "N/A"
    );
  };

  const getDescription = (transaction) => {
    const reference = transaction.reference || {};

    if (reference.eventName) {
      return reference.eventName;
    }

    return transaction.description || "Eventure transaction";
  };

  const getStatusLabel = (status) => {
    const labels = {
      successful: "Successful",
      processed: "Refunded",
      pending: "Pending",
      created: "Created",
      failed: "Failed",
      refund_pending: "Refund Pending",
      refund_failed: "Refund Failed",
      refunded: "Refunded",
      expired: "Expired",
    };

    return labels[status] || status || "Unknown";
  };

  const showLoading = () => {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="history-loading">
            <span class="history-spinner"></span>
            Loading transactions...
          </div>
        </td>
      </tr>
    `;

    mobileList.innerHTML = `
      <div class="history-loading">
        <span class="history-spinner"></span>
        Loading transactions...
      </div>
    `;
  };

  const showEmpty = () => {
    const emptyContent = `
      <div class="history-empty">
        <i class="fa-solid fa-receipt"></i>
        <strong>No transactions found</strong>
        <span>Your transactions will appear here.</span>
      </div>
    `;

    tableBody.innerHTML = `
      <tr>
        <td colspan="6">${emptyContent}</td>
      </tr>
    `;

    mobileList.innerHTML = emptyContent;
  };

  const showError = (message) => {
    const errorContent = `
      <div class="history-error">
        <i class="fa-solid fa-circle-exclamation"></i>
        <strong>Unable to load transactions</strong>
        <span>${escapeHTML(message)}</span>
      </div>
    `;

    tableBody.innerHTML = `
      <tr>
        <td colspan="6">${errorContent}</td>
      </tr>
    `;

    mobileList.innerHTML = errorContent;
  };

  const updateSummary = (summary) => {
    totalPayments.textContent = formatCurrency(summary.totalPayments);
    totalRefunds.textContent = formatCurrency(summary.totalRefunds);
    totalCredits.textContent = formatCurrency(summary.totalCredits);
    totalTransactions.textContent = Number(
      summary.totalTransactions || 0,
    ).toLocaleString("en-IN");
  };

  const createDesktopRow = (transaction) => {
    const details = getTransactionDetails(transaction);

    const amount = formatCurrency(transaction.amount);

    const status = String(transaction.status || "unknown").toLowerCase();

    return `
      <tr>
        <td>
          <div class="history-transaction-info">
            <div class="history-transaction-icon ${details.className}">
              <i class="fa-solid ${details.icon}"></i>
            </div>

            <div>
              <div class="history-transaction-title">
                ${escapeHTML(details.title)}
              </div>

              <div class="history-transaction-subtitle">
                ${escapeHTML(getDescription(transaction))}
              </div>
            </div>
          </div>
        </td>

        <td>
          <div class="history-reference">
            ${escapeHTML(getReference(transaction))}
          </div>
        </td>

        <td>
          <div class="history-date">
            ${escapeHTML(formatDate(transaction.createdAt))}
          </div>
        </td>

        <td>
          <div class="history-method">
            ${escapeHTML(transaction.paymentMethod || "N/A")}
          </div>
        </td>

        <td>
          <span class="history-status ${escapeHTML(status)}">
            ${escapeHTML(getStatusLabel(status))}
          </span>
        </td>

        <td>
          <div class="history-amount ${details.amountClass}">
            ${details.sign}${escapeHTML(amount)}
          </div>
        </td>
      </tr>
    `;
  };

  const createMobileCard = (transaction) => {
    const details = getTransactionDetails(transaction);

    const amount = formatCurrency(transaction.amount);

    const status = String(transaction.status || "unknown").toLowerCase();

    return `
      <article class="history-mobile-card">

        <div class="history-mobile-top">

          <div class="history-transaction-info">

            <div class="history-transaction-icon ${details.className}">
              <i class="fa-solid ${details.icon}"></i>
            </div>

            <div>
              <div class="history-transaction-title">
                ${escapeHTML(details.title)}
              </div>

              <div class="history-transaction-subtitle">
                ${escapeHTML(getDescription(transaction))}
              </div>
            </div>

          </div>

          <span class="history-status ${escapeHTML(status)}">
            ${escapeHTML(getStatusLabel(status))}
          </span>

        </div>

        <div class="history-mobile-bottom">

          <div>
            <div class="history-mobile-reference">
              Ref: ${escapeHTML(getReference(transaction))}
            </div>

            <div class="history-mobile-date">
              ${escapeHTML(formatDate(transaction.createdAt))}
            </div>
          </div>

          <div class="history-amount ${details.amountClass}">
            ${details.sign}${escapeHTML(amount)}
          </div>

        </div>

      </article>
    `;
  };

  const renderTransactions = (transactions) => {
    if (!transactions.length) {
      showEmpty();
      return;
    }

    tableBody.innerHTML = transactions
      .map(createDesktopRow)
      .join("");

    mobileList.innerHTML = transactions
      .map(createMobileCard)
      .join("");
  };

  const updatePagination = (pagination) => {
    currentPage = pagination.currentPage || 1;
    totalPages = pagination.totalPages || 1;

    previousButton.disabled = !pagination.hasPreviousPage;
    nextButton.disabled = !pagination.hasNextPage;

    paginationInfo.textContent = `Page ${currentPage} of ${totalPages}`;

    const total = pagination.totalTransactions || 0;

    if (total === 0) {
      historyCount.textContent = "Showing 0 transactions";
      return;
    }

    const start = (currentPage - 1) * LIMIT + 1;
    const end = Math.min(currentPage * LIMIT, total);

    historyCount.textContent = `Showing ${start}-${end} of ${total} transactions`;
  };

  const fetchTransactions = async () => {
    showLoading();

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const params = new URLSearchParams({
        page: currentPage,
        limit: LIMIT,
        type: currentFilter,
      });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch transactions.");
      }

      const data = result.data;

      updateSummary(data.summary || {});
      renderTransactions(data.transactions || []);
      updatePagination(data.pagination || {});

    } catch (error) {
      console.error("Transaction history error:", error);
      showError(error.message || "Something went wrong.");
    }
  };

  filterSelect.addEventListener("change", () => {
    currentFilter = filterSelect.value;
    currentPage = 1;
    fetchTransactions();
  });

  previousButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      fetchTransactions();
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      fetchTransactions();
    }
  });

  fetchTransactions();
});