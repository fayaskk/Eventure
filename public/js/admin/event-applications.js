const token = sessionStorage.getItem("token") || localStorage.getItem("token");

const eventsContainer = document.getElementById("events-container");

const eventCount = document.getElementById("event-count");

const getPendingEvents = async () => {
  try {
    const response = await fetch("/api/admin/events", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      window.location.replace("/login");

      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch pending events.");
    }

    renderEvents(result.events);
  } catch (error) {
    console.error("Admin Events Error:", error);

    eventsContainer.innerHTML = `
      <div class="error-state">

        <h3>
          Unable to load events
        </h3>

        <p>
          ${error.message}
        </p>

      </div>
    `;
  }
};

const renderEvents = (events) => {
  eventsContainer.innerHTML = "";

  if (events.length === 0) {
    eventsContainer.innerText = "There are no events waiting for approval.";

    eventCount.textContent = "0 events waiting for approval";

    return;
  }

  eventCount.textContent = `${events.length} event(s) waiting for approval`;

  events.forEach((event) => {
    const card = document.createElement("article");

    card.classList.add("event-card");

    card.innerHTML = `
      <img
        src="${event.banner}"
        alt="${event.eventName}"
        class="event-banner"
      >

      <div class="event-content">

        <span class="event-category">
          ${event.category.name}
        </span>

        <h3 class="event-name">
          ${event.eventName}
        </h3>

        <p class="event-host">
          Host: ${event.host.name}
        </p>

        <p class="event-host-email">
          ${event.host.email}
        </p>

        <p class="event-location">
          ${event.location.city}
        </p>

        <div class="event-schedule">

          <span class="event-date">
            ${event.eventDate}
          </span>

          <span class="event-time">
            ${event.startTime}
            -
            ${event.endTime}
          </span>

        </div>

        <span class="event-status">
          ${event.status}
        </span>

        <a
          href="/admin/event-applications/${event._id}"
          class="view-event-btn"
        >
          View Event
        </a>

      </div>
    `;

    eventsContainer.appendChild(card);
  });
};

getPendingEvents();
