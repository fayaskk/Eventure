const token =
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

const eventId = window.location.pathname.split("/").at(-2);

const editEventForm = document.getElementById("editEventForm");
const categorySelect = document.getElementById("category");
const ticketsContainer = document.getElementById("ticketsContainer");
const addTicketBtn = document.getElementById("addTicketBtn");
const updateEventBtn = document.getElementById("updateEventBtn");
const formMessage = document.getElementById("formMessage");

const getEventDetails = async () => {
  try {
    const response = await fetch(`/api/host/events/${eventId}`, {
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

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch event");
    }

    if (!result.success) {
      throw new Error(result.message || "Event not found");
    }

    const event = result.event;

    await loadCategories(event.category._id);

    document.getElementById("eventName").value = event.eventName;
    document.getElementById("description").value = event.description;
    document.getElementById("banner").value = event.banner;

    document.getElementById("venue").value =
      event.location.venue;

    document.getElementById("address").value =
      event.location.address;

    document.getElementById("city").value =
      event.location.city;

    document.getElementById("state").value =
      event.location.state;

    document.getElementById("pincode").value =
      event.location.pincode;

    document.getElementById("eventDate").value =
      event.eventDate.split("T")[0];

    document.getElementById("startTime").value =
      event.startTime;

    document.getElementById("endTime").value =
      event.endTime;

    ticketsContainer.innerHTML = "";

    event.tickets.forEach((ticket) => {
      addTicket(ticket);
    });

  } catch (error) {
    console.error("Edit Event Page Error:", error);

    formMessage.textContent =
      error.message || "Failed to load event details.";
  }
};

const loadCategories = async (selectedCategoryId) => {
  try {
    const response = await fetch("/api/categories");

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to fetch categories"
      );
    }

    categorySelect.innerHTML =
      `<option value="">Select Category</option>`;

    result.data.forEach((category) => {
      const option = document.createElement("option");

      option.value = category._id;
      option.textContent = category.name;

      if (category._id === selectedCategoryId) {
        option.selected = true;
      }

      categorySelect.appendChild(option);
    });

  } catch (error) {
    console.error("Category loading error:", error);

    categorySelect.innerHTML =
      `<option value="">Unable to load categories</option>`;
  }
};

const addTicket = (ticket = {}) => {
  const ticketCard = document.createElement("div");

  ticketCard.className = "ticket-card";

  ticketCard.innerHTML = `
    <div class="form-group">
      <label>Ticket Name</label>
      <input
        type="text"
        class="ticket-name"
        value="${ticket.name || ""}"
        required
      >
    </div>

    <div class="form-group">
      <label>Price</label>
      <input
        type="number"
        class="ticket-price"
        value="${ticket.price ?? ""}"
        min="0.01"
        step="0.01"
        required
      >
    </div>

    <div class="form-group">
      <label>Quantity</label>
      <input
        type="number"
        class="ticket-quantity"
        value="${ticket.quantity ?? ""}"
        min="1"
        required
      >
    </div>

    <button
      type="button"
      class="remove-ticket-btn"
    >
      Remove
    </button>
  `;

  const removeTicketBtn =
    ticketCard.querySelector(".remove-ticket-btn");

  removeTicketBtn.addEventListener("click", () => {
    ticketCard.remove();
  });

  ticketsContainer.appendChild(ticketCard);
};

addTicketBtn.addEventListener("click", () => {
  addTicket();
});

editEventForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const ticketCards =
      document.querySelectorAll(".ticket-card");

    if (ticketCards.length === 0) {
      formMessage.textContent =
        "At least one ticket type is required.";
      return;
    }

    const tickets = Array.from(ticketCards).map((card) => {
      return {
        name: card.querySelector(".ticket-name").value.trim(),
        price: Number(
          card.querySelector(".ticket-price").value
        ),
        quantity: Number(
          card.querySelector(".ticket-quantity").value
        ),
      };
    });

    const eventData = {
      eventName: document
        .getElementById("eventName")
        .value
        .trim(),

      description: document
        .getElementById("description")
        .value
        .trim(),

      category: categorySelect.value,

      banner: document
        .getElementById("banner")
        .value
        .trim(),

      location: {
        venue: document
          .getElementById("venue")
          .value
          .trim(),

        address: document
          .getElementById("address")
          .value
          .trim(),

        city: document
          .getElementById("city")
          .value
          .trim(),

        state: document
          .getElementById("state")
          .value
          .trim(),

        pincode: document
          .getElementById("pincode")
          .value
          .trim(),
      },

      eventDate:
        document.getElementById("eventDate").value,

      startTime:
        document.getElementById("startTime").value,

      endTime:
        document.getElementById("endTime").value,

      tickets,
    };

    updateEventBtn.disabled = true;
    updateEventBtn.textContent = "Updating...";

    const response = await fetch(
      `/api/host/events/${eventId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventData),
      }
    );

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
      window.location.replace("/login");
      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Failed to update event"
      );
    }

    formMessage.textContent =
      "Event updated successfully.";

    window.location.href =
      `/host/events/${eventId}`;

  } catch (error) {
    console.error("Update Event Error:", error);

    formMessage.textContent =
      error.message || "Failed to update event.";

    updateEventBtn.disabled = false;
    updateEventBtn.textContent = "Update Event";
  }
});

getEventDetails();