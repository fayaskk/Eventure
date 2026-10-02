const token = localStorage.getItem("token") || sessionStorage.getItem("token");

if (!token) {
  window.location.replace("/login");
}

const createEventForm = document.getElementById("createEventForm");

const categorySelect = document.getElementById("category");
const addTicketBtn = document.getElementById("addTicketBtn");
const ticketsContainer = document.getElementById("ticketsContainer");

const getCategories = async () => {
  try {
    const response = await fetch("/api/categories");

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to fetch categories");
    }

    result.data.forEach((category) => {
      const option = new Option(category.name, category._id);

      categorySelect.add(option);
    });
  } catch (error) {
    console.error("Create-Event Page Error:", error);
  }
};

addTicketBtn.addEventListener("click", () => {
  const ticketType = document.createElement("div");

  ticketType.className = "ticket-card";

  ticketType.innerHTML = `
    <div class="form-group">
      <label>Ticket Name</label>

      <input
        type="text"
        class="ticket-name"
        placeholder="e.g., VIP"
        required
      >
    </div>

    <div class="form-group">
      <label>Ticket Price</label>

      <input
        type="number"
        class="ticket-price"
        placeholder="0.00"
        min="0.01"
        required
      >
    </div>

    <div class="form-group">
      <label>Ticket Count</label>

      <input
        type="number"
        class="ticket-quantity"
        placeholder="1"
        min="1"
        required
      >
    </div>

    <button
      type="button"
      class="remove-ticket-btn"
    >
      &times;
    </button>
  `;

  ticketType
    .querySelector(".remove-ticket-btn")
    .addEventListener("click", () => {
      ticketType.remove();
    });

  ticketsContainer.appendChild(ticketType);
});

createEventForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const eventName = document.getElementById("eventName").value.trim();

    const description = document.getElementById("description").value.trim();

    const category = document.getElementById("category").value;

    const banner = document.getElementById("banner").value.trim();

    const venue = document.getElementById("venue").value.trim();

    const address = document.getElementById("address").value.trim();

    const city = document.getElementById("city").value.trim();

    const state = document.getElementById("state").value.trim();

    const pincode = document.getElementById("pincode").value.trim();

    const eventDate = document.getElementById("eventDate").value;

    const startTime = document.getElementById("startTime").value;

    const endTime = document.getElementById("endTime").value;

    const ticketCards = document.querySelectorAll(".ticket-card");

    const tickets = [...ticketCards].map((ticketCard) => {
      const ticketName = ticketCard.querySelector(".ticket-name").value.trim();

      const ticketPrice = Number(
        ticketCard.querySelector(".ticket-price").value,
      );

      const ticketQuantity = Number(
        ticketCard.querySelector(".ticket-quantity").value,
      );

      return {
        name: ticketName,
        price: ticketPrice,
        quantity: ticketQuantity,
      };
    });

    const eventData = {
      eventName,

      description,

      category,

      banner,

      location: {
        venue,
        address,
        city,
        state,
        pincode,
      },

      eventDate,

      startTime,

      endTime,

      tickets,
    };

    const response = await fetch("/api/host/events", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify(eventData),
    });

    const data = await response.json();

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");

      sessionStorage.removeItem("token");

      window.location.replace("/login");

      return;
    }

    if (!response.ok) {
      throw new Error(data.message || "Failed to create event");
    }

    if (!data.success) {
      throw new Error(data.message || "Event creation failed");
    }

    alert("Event created successfully");

    setTimeout(() => {
      window.location.href = "/host/events";
    }, 2000);
  } catch (error) {
    console.error("Event application submission error:", error);

    alert(error.message || "Something went wrong while creating the event");
  }
});

getCategories();
