const token =
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

if (!token) {
  window.location.replace("/login");
}

const eventDetails =
  document.getElementById("event-details");

const eventId =
  window.location.pathname.split("/").pop();

const submitEvent = async () => {
  try {
    const response = await fetch(
      `/api/host/events/${eventId}/submit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      alert(result.message || "Unauthorized");

      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      window.location.replace("/login");

      return;
    }

    if (!response.ok || !result.success) {
      throw new Error(
        result.message ||
          "Failed to submit event"
      );
    }

    alert("Event submitted for approval");

    window.location.reload();
  } catch (error) {
    console.error(
      "Submit Event Error:",
      error
    );

    alert(error.message);
  }
};

const getEventDetails = async () => {
  try {
    const response = await fetch(
      `/api/host/events/${eventId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      alert(
        result.message ||
          "Unauthorized"
      );

      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      window.location.replace("/login");

      return;
    }

    if (response.status === 404) {
      eventDetails.innerHTML = `
        <p>Event not found.</p>
      `;

      return;
    }

    if (!response.ok) {
      throw new Error(
        result.message ||
          "Failed to fetch event"
      );
    }

    if (!result.success) {
      throw new Error(
        result.message ||
          "Unable to fetch event"
      );
    }

    const event = result.event;

    const ticketsHTML = event.tickets
      .map((ticket) => {
        return `
          <div class="ticket-card">

            <h3>${ticket.name}</h3>

            <p>
              Price: ₹${ticket.price}
            </p>

            <p>
              Quantity: ${ticket.quantity}
            </p>

            <p>
              Sold: ${ticket.sold}
            </p>

          </div>
        `;
      })
      .join("");

    let actionButtons = "";

    if (event.status === "draft") {
      actionButtons = `
        <a
          href="/host/events/${event._id}/edit"
          class="edit-event-btn"
        >
          Edit Event
        </a>

        <button
          type="button"
          class="submit-event-btn"
          id="submit-event-btn"
        >
          Submit for Approval
        </button>
      `;
    }

    if (event.status === "pending") {
      actionButtons = `
        <p>
          Your event has been submitted and is
          waiting for admin approval.
        </p>
      `;
    }

    if (event.status === "approved") {
      actionButtons = `
        <p>
          This event has been approved.
        </p>
      `;
    }

    if (event.status === "rejected") {
      actionButtons = `
        <p>
          Rejection Reason:
          ${event.rejectionReason || "No reason provided"}
        </p>

        <a
          href="/host/events/${event._id}/edit"
          class="edit-event-btn"
        >
          Edit Event
        </a>
      `;
    }

    const eventHTML = `
      <div class="event-details-card">

        <img
          src="${event.banner}"
          alt="${event.eventName}"
          class="event-banner"
        >

        <div class="event-content">

          <h1>
            ${event.eventName}
          </h1>

          <p>
            ${event.description}
          </p>

          <p>
            Category:
            ${event.category.name}
          </p>

          <h2>
            Location
          </h2>

          <p>
            ${event.location.venue}
          </p>

          <p>
            ${event.location.address}
          </p>

          <p>
            ${event.location.city},
            ${event.location.state}
            -
            ${event.location.pincode}
          </p>

          <h2>
            Schedule
          </h2>

          <p>
            Date:
            ${event.eventDate}
          </p>

          <p>
            Time:
            ${event.startTime}
            -
            ${event.endTime}
          </p>

          <h2>
            Tickets
          </h2>

          <div class="tickets-container">

            ${ticketsHTML}

          </div>

          <p>
            Status:
            ${event.status}
          </p>

          ${actionButtons}

        </div>

      </div>
    `;

    eventDetails.innerHTML = eventHTML;

    const submitEventBtn =
      document.getElementById(
        "submit-event-btn"
      );

    if (submitEventBtn) {
      submitEventBtn.addEventListener(
        "click",
        submitEvent
      );
    }
  } catch (error) {
    console.error(
      "Event Details Page Error:",
      error
    );

    eventDetails.innerHTML = `
      <p>
        Failed to load event details.
      </p>
    `;
  }
};

getEventDetails();