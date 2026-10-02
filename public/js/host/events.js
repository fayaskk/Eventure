const token = sessionStorage.getItem("token") || localStorage.getItem("token");

const eventsContainer = document.getElementById("events-container");

const getHostEvents = async () => {
  try {
    const response = await fetch("/api/host/events", {
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
    }

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch events");
    }

    if (!result.success) {
      throw new Error(result.message || "Events not available");
    }

    if (result.data.length === 0) {
      const newParagraph = document.createElement("p");

      newParagraph.innerText = "You haven't created any events yet.";

      eventsContainer.appendChild(newParagraph);

      return;
    }

    result.data.forEach((event) => {
      const card = document.createElement("div");

      card.className = "event-card";

      card.innerHTML = `
        <img
          src="${event.banner}"
          alt="${event.eventName}"
        >

        <div class="event-card-content">

          <h3>${event.eventName}</h3>

          <p>${event.category.name}</p>

          <p>${event.location.city}</p>

          <p>${event.eventDate}</p>

          <span>${event.status}</span>

            <a
      href="/host/events/${event._id}"
      class="view-event-btn"
    >
      View Event
    </a>
        </div>
      `;

      eventsContainer.appendChild(card);
    });
  } catch (error) {
    console.error("Events Page Error:", error);

    eventsContainer.innerHTML = `
      <p>
        Failed to load your events.
        Please try again later.
      </p>
    `;
  }
};

getHostEvents();
