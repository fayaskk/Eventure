const token =
    sessionStorage.getItem("token") ||
    localStorage.getItem("token");

const loadingState =
    document.getElementById("loadingState");

const errorState =
    document.getElementById("errorState");

const errorMessage =
    document.getElementById("errorMessage");

const hostContent =
    document.getElementById("hostContent");

const hostInitial =
    document.getElementById("hostInitial");

const hostName =
    document.getElementById("hostName");

const hostEmail =
    document.getElementById("hostEmail");

const organizationName =
    document.getElementById("organizationName");

const organizationType =
    document.getElementById("organizationType");

const website =
    document.getElementById("website");

const verificationStatus =
    document.getElementById("verificationStatus");

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

const accountStatus =
    document.getElementById("accountStatus");

const emailVerification =
    document.getElementById("emailVerification");

const joinedDate =
    document.getElementById("joinedDate");

const hostRole =
    document.getElementById("hostRole");

const statusBadge =
    document.getElementById("statusBadge");

const blockHostBtn =
    document.getElementById("blockHostBtn");

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

const logoutBtn =
    document.getElementById("logoutBtn");

const pathParts =
    window.location.pathname.split("/");

const hostId =
    pathParts[pathParts.length - 1];

let selectedHost = null;

let pendingAction = null;

function redirectToLogin() {

    sessionStorage.removeItem("token");
    localStorage.removeItem("token");

    window.location.href =
        "/login";
}

async function loadHost() {

    if (!token) {

        redirectToLogin();

        return;
    }

    try {

        const response =
            await fetch(
                `/api/admin/hosts/${hostId}`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },
                }
            );

        if (response.status === 401) {

            redirectToLogin();

            return;
        }

        const data =
            await response.json();

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load host"
            );
        }

        selectedHost =
            data.host;

        renderHost(
            selectedHost
        );

    } catch (error) {

        console.error(
            "Load host details error:",
            error
        );

        loadingState.style.display =
            "none";

        hostContent.style.display =
            "none";

        errorState.style.display =
            "flex";

        errorMessage.textContent =
            error.message;
    }
}

function renderHost(host) {

    const user =
        host.user || {};

    const name =
        user.name || "-";

    hostInitial.textContent =
        name !== "-"
            ? name.charAt(0).toUpperCase()
            : "H";

    hostName.textContent =
        name;

    hostEmail.textContent =
        user.email || "-";

    organizationName.textContent =
        host.organizationName || "-";

    organizationType.textContent =
        host.organizationType || "-";

    website.textContent =
        host.website || "-";

    verificationStatus.textContent =
        host.verificationStatus
            ? capitalize(
                host.verificationStatus
            )
            : "-";

    description.textContent =
        host.description || "-";

    primaryContact.textContent =
        host.contactDetails?.primaryContactName ||
        "-";

    contactEmail.textContent =
        host.contactDetails?.email ||
        "-";

    phoneNumber.textContent =
        host.contactDetails?.phoneNumber ||
        "-";

    officeAddress.textContent =
        host.contactDetails?.officeAddress ||
        "-";

    bankAccountName.textContent =
        host.bankAccountName ||
        "-";

    bankAccountNumber.textContent =
        host.bankAccountNumber ||
        "-";

    ifscCode.textContent =
        host.ifscCode ||
        "-";

    bankName.textContent =
        host.bankName ||
        "-";

    accountStatus.textContent =
        user.isBlocked
            ? "Blocked"
            : "Active";

    emailVerification.textContent =
        user.isVerified
            ? "Verified"
            : "Unverified";

    joinedDate.textContent =
        user.created_at
            ? new Date(
                user.created_at
            ).toLocaleDateString()
            : "-";

    hostRole.textContent =
        user.role || "host";

    updateStatus(host);

    loadingState.style.display =
        "none";

    errorState.style.display =
        "none";

    hostContent.style.display =
        "block";
}

function updateStatus(host) {

    const user =
        host.user || {};

    const blocked =
        user.isBlocked === true;

    statusBadge.textContent =
        blocked
            ? "Blocked"
            : "Active";

    statusBadge.className =
        blocked
            ? "status-badge status-blocked"
            : "status-badge status-active";

    accountStatus.textContent =
        blocked
            ? "Blocked"
            : "Active";

    blockHostBtn.textContent =
        blocked
            ? "Unblock Host"
            : "Block Host";

    blockHostBtn.className =
        blocked
            ? "success-btn"
            : "danger-btn";
}

function openActionModal(action) {

    pendingAction =
        action;

    actionModal.style.display =
        "flex";

    if (action === "block") {

        modalTitle.textContent =
            "Block Host";

        modalDescription.textContent =
            "Are you sure you want to block this host?";

        modalIcon.textContent =
            "!";

        confirmActionBtn.textContent =
            "Block Host";

        confirmActionBtn.className =
            "modal-confirm-btn";

    } else {

        modalTitle.textContent =
            "Unblock Host";

        modalDescription.textContent =
            "Are you sure you want to unblock this host?";

        modalIcon.textContent =
            "✓";

        confirmActionBtn.textContent =
            "Unblock Host";

        confirmActionBtn.className =
            "modal-confirm-btn";
    }
}

function closeActionModalWindow() {

    actionModal.style.display =
        "none";

    pendingAction =
        null;
}

blockHostBtn.addEventListener(
    "click",
    () => {

        if (!selectedHost) {
            return;
        }

        const action =
            selectedHost.user?.isBlocked
                ? "unblock"
                : "block";

        openActionModal(action);
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
            event.target === actionModal
        ) {

            closeActionModalWindow();
        }
    }
);

confirmActionBtn.addEventListener(
    "click",
    async () => {

        if (
            !selectedHost ||
            !pendingAction
        ) {
            return;
        }

        const action =
            pendingAction;

        try {

            confirmActionBtn.disabled =
                true;

            confirmActionBtn.textContent =
                action === "block"
                    ? "Blocking..."
                    : "Unblocking...";

            const response =
                await fetch(
                    `/api/admin/hosts/${selectedHost._id}/block`,
                    {
                        method: "PATCH",
                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },
                    }
                );

            if (response.status === 401) {

                redirectToLogin();

                return;
            }

            const data =
                await response.json();

            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to update host status"
                );
            }

            selectedHost.user.isBlocked =
                data.isBlocked;

            updateStatus(
                selectedHost
            );

            closeActionModalWindow();

        } catch (error) {

            console.error(
                "Block/unblock host error:",
                error
            );

            alert(
                error.message
            );

        } finally {

            confirmActionBtn.disabled =
                false;

            if (pendingAction) {

                confirmActionBtn.textContent =
                    pendingAction === "block"
                        ? "Block Host"
                        : "Unblock Host";
            }
        }
    }
);



function capitalize(value) {

    return value.charAt(0).toUpperCase() +
        value.slice(1);
}

loadHost();