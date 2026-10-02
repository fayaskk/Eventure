const token =
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

const loadingState =
  document.getElementById("loadingState");

const errorState =
  document.getElementById("errorState");

const errorMessage =
  document.getElementById("errorMessage");

const applicationContent =
  document.getElementById("applicationContent");

const applicantName =
  document.getElementById("applicantName");

const applicantEmail =
  document.getElementById("applicantEmail");

const organizationName =
  document.getElementById("organizationName");

const organizationType =
  document.getElementById("organizationType");

const website =
  document.getElementById("website");

const submittedDate =
  document.getElementById("submittedDate");

const description =
  document.getElementById("description");

const primaryContact =
  document.getElementById("primaryContact");

const contactEmail =
  document.getElementById("contactEmail");

const phoneNumber =
  document.getElementById("phoneNumber");

const officeAddress =
  document.getElementById("officeAddress");

const bankAccountName =
  document.getElementById("bankAccountName");

const bankAccountNumber =
  document.getElementById("bankAccountNumber");

const ifscCode =
  document.getElementById("ifscCode");

const bankName =
  document.getElementById("bankName");

const documentsContainer =
  document.getElementById("documentsContainer");

const statusBadge =
  document.getElementById("statusBadge");

const rejectionSection =
  document.getElementById("rejectionSection");

const rejectionReason =
  document.getElementById("rejectionReason");

const applicationActions =
  document.getElementById("applicationActions");

const approveBtn =
  document.getElementById("approveBtn");

const rejectBtn =
  document.getElementById("rejectBtn");

const actionModal =
  document.getElementById("actionModal");

const closeActionModal =
  document.getElementById("closeActionModal");

const cancelActionBtn =
  document.getElementById("cancelActionBtn");

const confirmActionBtn =
  document.getElementById("confirmActionBtn");

const modalTitle =
  document.getElementById("modalTitle");

const modalDescription =
  document.getElementById("modalDescription");

const modalIcon =
  document.getElementById("modalIcon");

const rejectionReasonWrapper =
  document.getElementById(
    "rejectionReasonWrapper"
  );

const rejectionReasonInput =
  document.getElementById(
    "rejectionReasonInput"
  );

const pathParts =
  window.location.pathname.split("/");

const applicationId =
  pathParts[pathParts.length - 1];

let pendingAction = null;

let selectedApplication = null;


function redirectToLogin() {
  sessionStorage.removeItem("token");
  localStorage.removeItem("token");

  window.location.replace(
    "/login"
  );
}


async function loadApplication() {
  try {
    if (!token) {
      redirectToLogin();
      return;
    }

    const response =
      await fetch(
        `/api/admin/hosts-applications/${applicationId}`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },

          cache: "no-store",
        }
      );

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      redirectToLogin();
      return;
    }

    const data =
      await response.json();

    if (!response.ok) {
      throw new Error(
        data.message ||
        "Failed to load application"
      );
    }

    selectedApplication =
      data.hostApplication;

    renderApplication(
      selectedApplication
    );
  } catch (error) {
    console.error(
      "Load host application error:",
      error
    );

    loadingState.style.display =
      "none";

    applicationContent.style.display =
      "none";

    errorState.style.display =
      "block";

    errorMessage.textContent =
      error.message ||
      "Failed to load application";
  }
}


function renderApplication(application) {
  const user =
    application.user || {};

  applicantName.textContent =
    user.name || "-";

  applicantEmail.textContent =
    user.email || "-";

  organizationName.textContent =
    application.organizationName || "-";

  organizationType.textContent =
    application.organizationType || "-";

  website.textContent =
    application.website || "-";

  submittedDate.textContent =
    application.created_at
      ? new Date(
          application.created_at
        ).toLocaleDateString()
      : "-";

  description.textContent =
    application.description || "-";

  primaryContact.textContent =
    application.contactDetails
      ?.primaryContactName || "-";

  contactEmail.textContent =
    application.contactDetails
      ?.email || "-";

  phoneNumber.textContent =
    application.contactDetails
      ?.phoneNumber || "-";

  officeAddress.textContent =
    application.contactDetails
      ?.officeAddress || "-";

  bankAccountName.textContent =
    application.bankAccountName || "-";

  bankAccountNumber.textContent =
    application.bankAccountNumber || "-";

  ifscCode.textContent =
    application.ifscCode || "-";

  bankName.textContent =
    application.bankName || "-";

  renderDocuments(
    application.documents
  );

  updateStatus(application);

  loadingState.style.display =
    "none";

  errorState.style.display =
    "none";

  applicationContent.style.display =
    "block";
}


function renderDocuments(documents) {
  documentsContainer.innerHTML =
    "";

  const documentList = [
    {
      key: "identityProof",
      title: "Identity Proof",
    },
    {
      key: "organizationProof",
      title: "Organization Proof",
    },
    {
      key: "addressProof",
      title: "Address Proof",
    },
    {
      key: "bankProof",
      title: "Bank Proof",
    },
  ];

  documentList.forEach(
    (documentItem) => {
      const documentData =
        documents?.[
          documentItem.key
        ];

      const card =
        document.createElement("div");

      card.className =
        "document-card";

      const info =
        document.createElement("div");

      info.className =
        "document-info";

      const title =
        document.createElement("h4");

      title.className =
        "document-title";

      title.textContent =
        documentItem.title;

      const type =
        document.createElement("p");

      type.className =
        "document-type";

      type.textContent =
        documentData?.documentType
          ? documentData.documentType
          : "Document type not available";

      info.appendChild(title);

      info.appendChild(type);

      if (documentData?.fileUrl) {
        const viewButton =
          document.createElement("button");

        viewButton.type =
          "button";

        viewButton.className =
          "document-view-btn";

        viewButton.textContent =
          "View Document";

        viewButton.addEventListener(
          "click",
          () => {
            viewDocument(
              documentItem.key
            );
          }
        );

        card.appendChild(info);

        card.appendChild(
          viewButton
        );
      } else {
        const missing =
          document.createElement("span");

        missing.className =
          "document-missing";

        missing.textContent =
          "Not uploaded";

        card.appendChild(info);

        card.appendChild(
          missing
        );
      }

      documentsContainer.appendChild(
        card
      );
    }
  );
}


async function viewDocument(
  documentType
) {
  const currentToken =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

  if (!currentToken) {
    redirectToLogin();
    return;
  }

  const url =
    `/api/admin/hosts-applications/${applicationId}/documents/${documentType}`;

  try {
    const response =
      await fetch(url, {
        method: "GET",

        headers: {
          Authorization:
            `Bearer ${currentToken}`,
        },

        cache: "no-store",
      });

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      const data =
        await response
          .json()
          .catch(() => ({}));

      throw new Error(
        data.message ||
        "Unable to open document"
      );
    }

    const blob =
      await response.blob();

    const blobUrl =
      URL.createObjectURL(blob);

    const newWindow =
      window.open(
        blobUrl,
        "_blank"
      );

    if (!newWindow) {
      URL.revokeObjectURL(
        blobUrl
      );

      showMessage(
        "Please allow pop-ups to view the document.",
        "warning"
      );

      return;
    }

    setTimeout(() => {
      URL.revokeObjectURL(
        blobUrl
      );
    }, 60000);
  } catch (error) {
    console.error(
      "View document error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to open document.",
      "error"
    );
  }
}


function updateStatus(application) {
  const status =
    application.verificationStatus ||
    "pending";

  statusBadge.textContent =
    capitalize(status);

  statusBadge.className =
    `status-badge status-${status}`;

  if (status === "rejected") {
    rejectionSection.style.display =
      "block";

    rejectionReason.textContent =
      application.rejectionReason ||
      "No rejection reason provided.";
  } else {
    rejectionSection.style.display =
      "none";
  }

  if (status === "pending") {
    applicationActions.style.display =
      "flex";
  } else {
    applicationActions.style.display =
      "none";
  }
}


function openActionModal(action) {
  pendingAction =
    action;

  actionModal.style.display =
    "flex";

  if (action === "approve") {
    modalTitle.textContent =
      "Approve Application";

    modalDescription.textContent =
      "Are you sure you want to approve this host application?";

    modalIcon.textContent =
      "✓";

    rejectionReasonWrapper.style.display =
      "none";

    rejectionReasonInput.value =
      "";

    confirmActionBtn.textContent =
      "Approve";

    confirmActionBtn.className =
      "confirm-btn";
  } else {
    modalTitle.textContent =
      "Reject Application";

    modalDescription.textContent =
      "Are you sure you want to reject this host application?";

    modalIcon.textContent =
      "!";

    rejectionReasonWrapper.style.display =
      "block";

    rejectionReasonInput.value =
      "";

    confirmActionBtn.textContent =
      "Reject";

    confirmActionBtn.className =
      "confirm-btn reject-mode";
  }
}


function closeActionModalWindow() {
  actionModal.style.display =
    "none";

  pendingAction =
    null;

  rejectionReasonInput.value =
    "";
}


approveBtn.addEventListener(
  "click",
  () => {
    openActionModal("approve");
  }
);


rejectBtn.addEventListener(
  "click",
  () => {
    openActionModal("reject");
  }
);


closeActionModal.addEventListener(
  "click",
  closeActionModalWindow
);


cancelActionBtn.addEventListener(
  "click",
  closeActionModalWindow
);


actionModal.addEventListener(
  "click",
  (event) => {
    if (
      event.target ===
      actionModal
    ) {
      closeActionModalWindow();
    }
  }
);


confirmActionBtn.addEventListener(
  "click",
  async () => {
    if (
      !selectedApplication ||
      !pendingAction
    ) {
      return;
    }

    const action =
      pendingAction;

    const reason =
      rejectionReasonInput.value.trim();

    if (
      action === "reject" &&
      !reason
    ) {
      showMessage(
        "Please enter a rejection reason.",
        "warning"
      );

      rejectionReasonInput.focus();

      return;
    }

    try {
      confirmActionBtn.disabled =
        true;

      confirmActionBtn.textContent =
        action === "approve"
          ? "Approving..."
          : "Rejecting...";

      const endpoint =
        action === "approve"
          ? `/api/admin/hosts-applications/${selectedApplication._id}/approve`
          : `/api/admin/hosts-applications/${selectedApplication._id}/reject`;

      const requestOptions = {
        method: "PATCH",

        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      };

      if (
        action === "reject"
      ) {
        requestOptions.headers[
          "Content-Type"
        ] =
          "application/json";

        requestOptions.body =
          JSON.stringify({
            rejectionReason:
              reason,
          });
      }

      const response =
        await fetch(
          endpoint,
          requestOptions
        );

      if (
        response.status === 401 ||
        response.status === 403
      ) {
        redirectToLogin();
        return;
      }

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to update application"
        );
      }

      selectedApplication.verificationStatus =
        action === "approve"
          ? "approved"
          : "rejected";

      if (
        action === "reject"
      ) {
        selectedApplication.rejectionReason =
          reason;
      }

      closeActionModalWindow();

      updateStatus(
        selectedApplication
      );

      showMessage(
        data.message ||
          (
            action === "approve"
              ? "Application approved successfully."
              : "Application rejected successfully."
          ),
        "success"
      );
    } catch (error) {
      console.error(
        "Application action error:",
        error
      );

      showMessage(
        error.message ||
        "Failed to update application.",
        "error"
      );
    } finally {
      confirmActionBtn.disabled =
        false;

      confirmActionBtn.textContent =
        "Confirm";
    }
  }
);


function capitalize(value) {
  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
  );
}


loadApplication();