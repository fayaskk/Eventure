document.addEventListener("DOMContentLoaded", () => {
  loadHostApplication();

  const form = document.getElementById("hostApplicationForm");

  if (form) {
    form.addEventListener("submit", handleHostApplicationSubmit);
  }
});

async function loadHostApplication() {
  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) {
    window.location.replace("/login");
    return;
  }

  const loading =
    document.getElementById("applicationLoading");

  const content =
    document.getElementById("applicationContent");

  const noApplication =
    document.getElementById("noApplication");

  try {
    const response = await fetch(
      "/api/host-applications/my-application",
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      window.location.replace("/login");
      return;
    }

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message || "Failed to load application"
      );
    }

    loading?.classList.add("hidden");

    if (!data.hasApplication || !data.application) {
      noApplication?.classList.remove("hidden");
      return;
    }

    content?.classList.remove("hidden");

    renderApplication(data.application);
  } catch (error) {
    console.error(
      "Host application error:",
      error
    );

    loading?.classList.add("hidden");

    const message =
      document.getElementById("applicationMessage");

    if (message) {
      message.textContent =
        "Unable to load application status.";
    }
  }
}

function renderApplication(application) {
  const status =
    application.verificationStatus;

  const statusIcon =
    document.getElementById("statusIcon");

  const statusTitle =
    document.getElementById("statusTitle");

  const statusDescription =
    document.getElementById("statusDescription");

  const statusBadge =
    document.getElementById("statusBadge");

  const rejectionSection =
    document.getElementById("rejectionSection");

  const rejectionReason =
    document.getElementById("rejectionReason");

  const actions =
    document.getElementById("applicationActions");

  const organizationName =
    document.getElementById("organizationName");

  const organizationType =
    document.getElementById("organizationType");

  const submittedDate =
    document.getElementById("submittedDate");

  if (organizationName) {
    organizationName.textContent =
      application.organizationName;
  }

  if (organizationType) {
    organizationType.textContent =
      application.organizationType;
  }

  if (submittedDate) {
    submittedDate.textContent =
      formatDate(
        application.created_at ||
        application.createdAt
      );
  }

  rejectionSection?.classList.add("hidden");

  if (status === "pending") {
    if (statusIcon) {
      statusIcon.textContent = "⏳";
    }

    if (statusTitle) {
      statusTitle.textContent =
        "Application Under Review";
    }

    if (statusDescription) {
      statusDescription.textContent =
        "Your application has been submitted and is currently being reviewed by the Eventure team.";
    }

    if (statusBadge) {
      statusBadge.textContent = "Pending";
    }

    if (actions) {
      actions.innerHTML = `
        <p class="action-info">
          Please wait while our team completes the verification.
        </p>
      `;
    }

    return;
  }

  if (status === "rejected") {
    if (statusIcon) {
      statusIcon.textContent = "⚠️";
    }

    if (statusTitle) {
      statusTitle.textContent =
        "Application Rejected";
    }

    if (statusDescription) {
      statusDescription.textContent =
        "Your application was not approved. Please review the reason below.";
    }

    if (statusBadge) {
      statusBadge.textContent = "Rejected";
    }

    rejectionSection?.classList.remove("hidden");

    if (rejectionReason) {
      rejectionReason.textContent =
        application.rejectionReason ||
        "No rejection reason was provided.";
    }

    if (actions) {
      actions.innerHTML = `
        <a
          href="/apply-host"
          class="primary-btn"
        >
          Update Application
        </a>
      `;
    }

    return;
  }

  if (status === "approved") {
    if (statusIcon) {
      statusIcon.textContent = "✓";
    }

    if (statusTitle) {
      statusTitle.textContent =
        "You're an Eventure Host!";
    }

    if (statusDescription) {
      statusDescription.textContent =
        "Your host application has been approved successfully.";
    }

    if (statusBadge) {
      statusBadge.textContent = "Approved";
    }

    if (actions) {
      actions.innerHTML = `
        <a
          href="/host/dashboard"
          class="primary-btn"
        >
          Go to Host Dashboard →
        </a>
      `;
    }
  }
}

async function handleHostApplicationSubmit(event) {
  event.preventDefault();

  const form = event.target;

  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) {
    window.location.replace("/login");
    return;
  }

  const submitButton =
    form.querySelector(
      'button[type="submit"]'
    );

  const formData =
    new FormData(form);

  const contactDetails = {
    primaryContactName:
      form.querySelector(
        '[name="primaryContactName"]'
      )?.value || "",

    email:
      form.querySelector(
        '[name="email"]'
      )?.value || "",

    phoneNumber:
      form.querySelector(
        '[name="phoneNumber"]'
      )?.value || "",

    officeAddress:
      form.querySelector(
        '[name="officeAddress"]'
      )?.value || "",
  };

  // Remove individual contact fields
  // because backend expects contactDetails as JSON
  formData.delete("primaryContactName");
  formData.delete("email");
  formData.delete("phoneNumber");
  formData.delete("officeAddress");

  formData.append(
    "contactDetails",
    JSON.stringify(contactDetails)
  );

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent =
        "Submitting...";
    }

    const response = await fetch(
      "/api/host-applications",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${token}`,
        },

        body: formData,
      }
    );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      window.location.replace("/login");

      return;
    }

    const data =
      await response.json();

    if (!response.ok || !data.success) {
      throw new Error(
        data.message ||
        "Failed to submit host application"
      );
    }

    alert(
      "Host application submitted successfully!"
    );

    window.location.href =
      "/host-application";
  } catch (error) {
    console.error(
      "Host application submission error:",
      error
    );

    alert(
      error.message ||
      "Unable to submit host application."
    );
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent =
        "Submit Application";
    }
  }
}



function formatDate(date) {
  if (!date) {
    return "—";
  }

  return new Date(date).toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}