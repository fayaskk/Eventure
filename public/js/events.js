const eventContainer = document.getElementById("events-container");

const loadEvents = async () => {
  try {
    const params = new URLSearchParams(window.location.href);
    const category = params.get("category");

    const apiUrl = category
      ? `/api/events/category=${encodeURIComponent(category)}`
      : "/api/events";

    const response = await fetch(apiUrl);
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch events");
    }

    if (result.data.length === 0) {
      eventContainer.innerHTML = `
      <div class="events-empty">
          No events available.
        </div>`;
      return;
    }
    result.data.forEach((event) => {
      const card = document.createElement("div");
      card.className = "event-card";

      card.innerHTML = `   <img
          src="${event.banner}"
          alt="${event.eventName}"
          class="event-card-image"
        />
               <div class="event-card-content">

          <h3>
            ${event.eventName}
          </h3>

          <p>
            ${event.description}
          </p>

          <span>
            ${event.category.name}
          </span>

          <span>
            ${event.location.city}
          </span>

        </div>`;

        eventContainer.appendChild(card)
    });
  } catch (error) {
        console.error("Events Page Error:", error);

    eventContainer.innerHTML = `
      <div class="events-error">
        Failed to load events. Please try again later.
      </div>
    `;
  }
};
loadEvents();
