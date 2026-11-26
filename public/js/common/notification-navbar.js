document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById(
    "navbarNotificationWrapper"
  );

  const toggle = document.getElementById(
    "navbarNotificationToggle"
  );

  const dropdown = document.getElementById(
    "navbarNotificationDropdown"
  );

  const badge = document.getElementById(
    "navbarNotificationBadge"
  );

  const notificationList = document.getElementById(
    "navbarNotificationList"
  );

  const headerSubtitle = document.getElementById(
    "notificationHeaderSubtitle"
  );

  const markAllButton = document.getElementById(
    "markAllNotificationsRead"
  );

  if (!wrapper || !toggle || !dropdown) {
    return;
  }

  const getToken = () =>
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  const getHeaders = () => ({
    Authorization: `Bearer ${getToken()}`,
    "Content-Type": "application/json",
  });

  let unreadCount = 0;

  const formatTime = (date) => {
    const notificationDate = new Date(date);

    if (Number.isNaN(notificationDate.getTime())) {
      return "";
    }

    return notificationDate.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getNotificationIcon = (type) => {
    const icons = {
      booking: "bi-ticket-perforated",
      payment: "bi-credit-card",
      refund: "bi-arrow-counterclockwise",
      event: "bi-calendar-event",
      event_update: "bi-calendar-check",
      event_cancellation: "bi-calendar-x",
      host_application: "bi-building",
      review: "bi-star",
      settlement: "bi-wallet2",
      system: "bi-info-circle",
    };

    return icons[type] || "bi-bell";
  };

  const updateBadge = (count) => {
    unreadCount = Math.max(0, Number(count) || 0);

    if (unreadCount > 0) {
      badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }

    headerSubtitle.textContent =
      unreadCount > 0
        ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
        : "You're all caught up!";
  };

  const updateUnreadCount = async () => {
    const token = getToken();

    if (!token) {
      updateBadge(0);
      return;
    }

    try {
      const response = await fetch(
        "/api/notifications/unread-count",
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      );

      if (!response.ok) {
        return;
      }

      const result = await response.json();

      updateBadge(result.data?.unreadCount ?? 0);
    } catch (error) {
      console.error(
        "Unread notification count error:",
        error
      );
    }
  };

  const renderNotifications = (notifications) => {
    notificationList.replaceChildren();

    if (!notifications.length) {
      const empty = document.createElement("div");

      empty.className = "notification-empty";
      empty.textContent = "You're all caught up. No notifications yet.";

      notificationList.appendChild(empty);
      return;
    }

    notifications.forEach((notification) => {
      const item = document.createElement("div");

      item.className = `notification-item ${
        notification.isRead ? "" : "unread"
      }`;

      item.dataset.id = notification._id;

      const icon = document.createElement("div");
      icon.className = "notification-item-icon";

      const iconElement = document.createElement("i");
      iconElement.className =
        `bi ${getNotificationIcon(notification.type)}`;

      icon.appendChild(iconElement);

      const content = document.createElement("div");
      content.className = "notification-item-content";

      const title = document.createElement("h4");
      title.textContent = notification.title;

      const message = document.createElement("p");
      message.textContent = notification.message;

      const time = document.createElement("span");
      time.className = "notification-item-time";
      time.textContent = formatTime(notification.created_at);

      content.append(title, message, time);

      item.append(icon, content);

      if (!notification.isRead) {
        const dot = document.createElement("span");
        dot.className = "notification-unread-dot";
        item.appendChild(dot);
      }

      item.addEventListener("click", () => {
        handleNotificationClick(notification);
      });

      notificationList.appendChild(item);
    });
  };

  const loadNotifications = async () => {
    const token = getToken();

    if (!token) {
      notificationList.textContent = "Please log in to view notifications.";
      return;
    }

    notificationList.textContent = "Loading notifications...";

    try {
      const response = await fetch(
        "/api/notifications?page=1&limit=5&filter=all",
        {
          headers: getHeaders(),
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to load notifications"
        );
      }

      renderNotifications(
        result.data?.notifications || []
      );

      await updateUnreadCount();
    } catch (error) {
      console.error("Notification loading error:", error);

      notificationList.textContent =
        "Unable to load notifications. Please try again.";
    }
  };

  const markAsRead = async (notificationId) => {
    const response = await fetch(
      `/api/notifications/${notificationId}/read`,
      {
        method: "PATCH",
        headers: getHeaders(),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "Unable to mark notification as read"
      );
    }

    return result;
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.isRead) {
        await markAsRead(notification._id);
      }

      const actionUrl = notification.actionUrl;

      if (actionUrl) {
        const destination = new URL(
          actionUrl,
          window.location.origin
        );

        if (destination.origin === window.location.origin) {
          window.location.assign(destination.href);
          return;
        }
      }

      await loadNotifications();
    } catch (error) {
      console.error("Notification click error:", error);
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) {
      return;
    }

    markAllButton.disabled = true;

    try {
      const response = await fetch(
        "/api/notifications/read-all",
        {
          method: "PATCH",
          headers: getHeaders(),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to mark notifications as read"
        );
      }

      await loadNotifications();
    } catch (error) {
      console.error("Mark all notifications error:", error);
    } finally {
      markAllButton.disabled = false;
    }
  };

  const closeDropdown = () => {
    wrapper.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", async (event) => {
    event.stopPropagation();

    const isOpen = wrapper.classList.toggle("open");

    toggle.setAttribute("aria-expanded", String(isOpen));

    if (isOpen) {
      await loadNotifications();
    }
  });

  markAllButton.addEventListener(
    "click",
    markAllAsRead
  );

  document.addEventListener("click", (event) => {
    if (!wrapper.contains(event.target)) {
      closeDropdown();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDropdown();
    }
  });

  window.addEventListener(
    "eventure:notification",
    (event) => {
      const notification = event.detail;

      if (!notification) {
        return;
      }

      if (!notification.isRead) {
        updateBadge(unreadCount + 1);
      }

      if (wrapper.classList.contains("open")) {
        loadNotifications();
      }
    }
  );

  updateUnreadCount();
});