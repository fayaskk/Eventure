document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "/api/notifications";
  const LIMIT = 10;

  const notificationsList = document.getElementById("notificationsList");
  const unreadCountElement = document.getElementById(
    "unreadNotificationCount",
  );

  const markAllReadButton = document.getElementById("markAllReadButton");

  const filterButtons = document.querySelectorAll(".notification-filter");

  const notificationsCount = document.getElementById("notificationsCount");
  const paginationInfo = document.getElementById(
    "notificationsPaginationInfo",
  );

  const previousButton = document.getElementById("notificationsPrevPage");
  const nextButton = document.getElementById("notificationsNextPage");

  let currentPage = 1;
  let totalPages = 1;
  let currentFilter = "all";
  let unreadCount = 0;
  let isLoading = false;

  const getToken = () => {
    return (
      localStorage.getItem("token") ||
      localStorage.getItem("accessToken") ||
      sessionStorage.getItem("token") ||
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

  const getRelativeTime = (date) => {
    if (!date) return "Recently";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return "Recently";
    }

    const difference = Date.now() - parsedDate.getTime();

    if (difference < 0) return "Just now";

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (hours < 24) return `${hours} hr ago`;
    if (days < 7) return `${days} days ago`;

    return formatDate(date);
  };

  const getNotificationDetails = (type) => {
    const details = {
      booking: {
        icon: "fa-ticket",
        className: "booking",
      },
      payment: {
        icon: "fa-credit-card",
        className: "payment",
      },
      refund: {
        icon: "fa-arrow-rotate-left",
        className: "refund",
      },
      event: {
        icon: "fa-calendar-check",
        className: "event",
      },
      event_update: {
        icon: "fa-calendar-days",
        className: "event_update",
      },
      event_cancellation: {
        icon: "fa-calendar-xmark",
        className: "event_cancellation",
      },
      host_application: {
        icon: "fa-user-check",
        className: "host_application",
      },
      review: {
        icon: "fa-star",
        className: "review",
      },
      settlement: {
        icon: "fa-wallet",
        className: "settlement",
      },
      system: {
        icon: "fa-circle-info",
        className: "system",
      },
    };

    return (
      details[type] || {
        icon: "fa-bell",
        className: "system",
      }
    );
  };

  const getSafeActionUrl = (actionUrl) => {
    if (!actionUrl || typeof actionUrl !== "string") {
      return null;
    }

    try {
      const url = new URL(actionUrl, window.location.origin);

      if (url.origin !== window.location.origin) {
        return null;
      }

      if (!["http:", "https:"].includes(url.protocol)) {
        return null;
      }

      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return null;
    }
  };

  const updateUnreadCount = (count) => {
    unreadCount = Math.max(0, Number(count) || 0);

    unreadCountElement.textContent = unreadCount.toLocaleString("en-IN");

    markAllReadButton.disabled = unreadCount === 0;

    document.dispatchEvent(
      new CustomEvent("eventure:unread-count-updated", {
        detail: { unreadCount },
      }),
    );
  };

  const fetchUnreadCount = async () => {
    try {
      const token = getToken();

      if (!token) return;

      const response = await fetch(`${API_URL}/unread-count`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to fetch unread count.");
      }

      updateUnreadCount(result.data?.unreadCount);
    } catch (error) {
      console.error("Unread notification count error:", error);
    }
  };

  const showLoading = () => {
    notificationsList.innerHTML = `
      <div class="notification-loading">
        <span class="notification-spinner"></span>
        Loading notifications...
      </div>
    `;
  };

  const showEmpty = () => {
    const messages = {
      all: {
        icon: "fa-bell-slash",
        title: "No notifications yet",
        message: "Your updates will appear here when something happens.",
      },
      unread: {
        icon: "fa-check-circle",
        title: "You're all caught up!",
        message: "You don't have any unread notifications.",
      },
      read: {
        icon: "fa-envelope-open",
        title: "No read notifications",
        message: "Notifications you have read will appear here.",
      },
    };

    const content = messages[currentFilter];

    notificationsList.innerHTML = `
      <div class="notification-empty">
        <i class="fa-solid ${content.icon}"></i>
        <strong>${content.title}</strong>
        <span>${content.message}</span>
      </div>
    `;
  };

  const showError = (message) => {
    notificationsList.innerHTML = `
      <div class="notification-error">
        <i class="fa-solid fa-circle-exclamation"></i>
        <strong>Unable to load notifications</strong>
        <span>${escapeHTML(message)}</span>
      </div>
    `;
  };

  const createNotificationCard = (notification) => {
    const details = getNotificationDetails(notification.type);

    const isRead = Boolean(notification.isRead);

    const actionUrl = getSafeActionUrl(notification.actionUrl);

    const notificationId = escapeHTML(notification._id);

    return `
      <article
        class="notification-card ${isRead ? "read" : "unread"}"
        data-id="${notificationId}"
      >

        <div class="notification-type-icon ${details.className}">
          <i class="fa-solid ${details.icon}"></i>
        </div>

        <div class="notification-card-content">

          <div class="notification-card-top">

            <div>
              <h3 class="notification-card-title">
                ${escapeHTML(notification.title)}
              </h3>

              <p class="notification-card-message">
                ${escapeHTML(notification.message)}
              </p>
            </div>

            <span
              class="notification-card-time"
              title="${escapeHTML(formatDate(notification.created_at))}"
            >
              ${escapeHTML(getRelativeTime(notification.created_at))}
            </span>

          </div>

          <div class="notification-card-bottom">

            <div class="notification-card-actions">

              ${
                !isRead
                  ? `
                    <button
                      type="button"
                      class="notification-action mark-read-action"
                      data-id="${notificationId}"
                    >
                      Mark as read
                    </button>
                  `
                  : ""
              }

              ${
                actionUrl
                  ? `
                    <a
                      href="${escapeHTML(actionUrl)}"
                      class="notification-action notification-view-action"
                    >
                      View details
                    </a>
                  `
                  : ""
              }

              <button
                type="button"
                class="notification-action delete delete-notification-action"
                data-id="${notificationId}"
              >
                Delete
              </button>

            </div>

            ${
              !isRead
                ? '<span class="notification-unread-dot" title="Unread"></span>'
                : ""
            }

          </div>

        </div>

      </article>
    `;
  };

  const renderNotifications = (notifications) => {
    if (!notifications.length) {
      showEmpty();
      return;
    }

    notificationsList.innerHTML = notifications
      .map(createNotificationCard)
      .join("");
  };

  const updatePagination = (pagination) => {
    const page = Number(pagination.page) || 1;

    totalPages = Math.max(1, Number(pagination.totalPages) || 1);

    const total = Number(pagination.totalNotifications) || 0;

    currentPage = page;

    previousButton.disabled = page <= 1;
    nextButton.disabled = page >= totalPages;

    paginationInfo.textContent = `Page ${page} of ${totalPages}`;

    if (total === 0) {
      notificationsCount.textContent = "Showing 0 notifications";
      return;
    }

    const start = (page - 1) * LIMIT + 1;
    const end = Math.min(page * LIMIT, total);

    notificationsCount.textContent =
      `Showing ${start}-${end} of ${total} notifications`;
  };

  const fetchNotifications = async () => {
    if (isLoading) return;

    isLoading = true;
    showLoading();

    try {
      const token = getToken();

      if (!token) {
        throw new Error("Authentication token not found. Please log in again.");
      }

      const params = new URLSearchParams({
        page: currentPage,
        limit: LIMIT,
        filter: currentFilter,
      });

      const response = await fetch(`${API_URL}?${params.toString()}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch notifications.");
      }

      const data = result.data;

      renderNotifications(data.notifications || []);
      updatePagination(data.pagination || {});

      await fetchUnreadCount();
    } catch (error) {
      console.error("Notification loading error:", error);
      showError(error.message || "Something went wrong.");
    } finally {
      isLoading = false;
    }
  };

  const markNotificationAsRead = async (notificationId) => {
    try {
      const token = getToken();

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(notificationId)}/read`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to mark notification as read.");
      }

      await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
    } catch (error) {
      console.error("Mark notification as read error:", error);
      alert(error.message || "Something went wrong.");
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      const token = getToken();

      const response = await fetch(`${API_URL}/read-all`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to mark notifications as read.");
      }

      currentPage = 1;

      await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      alert(error.message || "Something went wrong.");
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = getToken();

      const response = await fetch(
        `${API_URL}/${encodeURIComponent(notificationId)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to delete notification.");
      }

      await Promise.all([
        fetchNotifications(),
        fetchUnreadCount(),
      ]);
    } catch (error) {
      console.error("Delete notification error:", error);
      alert(error.message || "Something went wrong.");
    }
  };

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      filterButtons.forEach((item) => item.classList.remove("active"));

      button.classList.add("active");

      currentFilter = button.dataset.filter;
      currentPage = 1;

      fetchNotifications();
    });
  });

  previousButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      fetchNotifications();
    }
  });

  nextButton.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      fetchNotifications();
    }
  });

  markAllReadButton.addEventListener(
    "click",
    markAllNotificationsAsRead,
  );

  notificationsList.addEventListener("click", (event) => {
    const markReadButton = event.target.closest(".mark-read-action");

    if (markReadButton) {
      markNotificationAsRead(markReadButton.dataset.id);
      return;
    }

    const deleteButton = event.target.closest(
      ".delete-notification-action",
    );

    if (deleteButton) {
      deleteNotification(deleteButton.dataset.id);
    }
  });

  // Socket.IO real-time notifications

  const token = getToken();

  if (token && typeof io === "function") {
    const socket = io({
      auth: {
        token,
      },
    });

    socket.on("connect", () => {
      console.log("Eventure notification socket connected.");
    });

    socket.on("connect_error", (error) => {
      console.error("Notification socket connection error:", error.message);
    });

    socket.on("notification:new", (notification) => {
      if (!notification || !notification._id) return;

      updateUnreadCount(unreadCount + 1);

      document.dispatchEvent(
        new CustomEvent("eventure:notification", {
          detail: notification,
        }),
      );

      if (currentFilter === "all" || currentFilter === "unread") {
        currentPage = 1;
        fetchNotifications();
      }
    });

    window.addEventListener("beforeunload", () => {
      socket.disconnect();
    });
  }

  fetchNotifications();
});