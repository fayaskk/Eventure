const loadingState =
    document.getElementById("loadingState");

const errorState =
    document.getElementById("errorState");

const errorMessage =
    document.getElementById("errorMessage");

const userContent =
    document.getElementById("userContent");

const userInitial =
    document.getElementById("userInitial");

const userName =
    document.getElementById("userName");

const userEmail =
    document.getElementById("userEmail");

const detailEmail =
    document.getElementById("detailEmail");

const detailRole =
    document.getElementById("detailRole");

const detailVerification =
    document.getElementById("detailVerification");

const detailStatus =
    document.getElementById("detailStatus");

const detailReferral =
    document.getElementById("detailReferral");

const detailJoined =
    document.getElementById("detailJoined");

const statusBadge =
    document.getElementById("statusBadge");

const blockUserBtn =
    document.getElementById("blockUserBtn");

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




const pathParts =
    window.location.pathname.split("/");

const userId =
    pathParts[pathParts.length - 1];


let selectedUser = null;

let pendingAction = null;




function getToken() {

    return (
        sessionStorage.getItem("token") ||
        localStorage.getItem("token")
    );

}



function redirectToLogin() {

    sessionStorage.removeItem("token");

    localStorage.removeItem("token");

    window.location.replace(
        "/login"
    );

}




async function loadUser() {

    const token = getToken();


    if (!token) {

        redirectToLogin();

        return;

    }


    try {

        const response =
            await fetch(
                `/api/admin/users/${userId}`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`,
                    },

                    cache: "no-store",
                }
            );


        const data =
            await response.json();



        if (response.status === 401) {

            redirectToLogin();

            return;

        }


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load user"
            );

        }


        selectedUser =
            data.user;


        renderUser(
            selectedUser
        );


    } catch (error) {

        console.error(
            "Load user details error:",
            error
        );


        loadingState.style.display =
            "none";


        userContent.style.display =
            "none";


        errorState.style.display =
            "block";


        errorMessage.textContent =
            error.message;

    }

}



function renderUser(user) {

    const name =
        user.name || "Unknown User";


    userInitial.textContent =
        name
            .charAt(0)
            .toUpperCase();


    userName.textContent =
        name;


    userEmail.textContent =
        user.email || "-";


    detailEmail.textContent =
        user.email || "-";


    detailRole.textContent =
        user.role || "-";


    detailVerification.textContent =
        user.isVerified
            ? "Verified"
            : "Unverified";


    detailStatus.textContent =
        user.isBlocked
            ? "Blocked"
            : "Active";


    detailReferral.textContent =
        user.referralCode || "-";


    detailJoined.textContent =
        user.created_at
            ? new Date(
                user.created_at
            ).toLocaleDateString()
            : "-";


    updateStatus(user);


    loadingState.style.display =
        "none";


    errorState.style.display =
        "none";


    userContent.style.display =
        "block";

}



function updateStatus(user) {

    const blocked =
        user.isBlocked === true;


    statusBadge.textContent =
        blocked
            ? "Blocked"
            : "Active";


    statusBadge.className =
        blocked
            ? "badge blocked"
            : "badge active";


    detailStatus.textContent =
        blocked
            ? "Blocked"
            : "Active";


    blockUserBtn.textContent =
        blocked
            ? "Unblock User"
            : "Block User";


    blockUserBtn.className =
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
            "Block User";


        modalDescription.textContent =
            "Are you sure you want to block this user?";


        modalIcon.textContent =
            "!";


        confirmActionBtn.textContent =
            "Block User";


        confirmActionBtn.className =
            "modal-confirm-btn";

    } else {

        modalTitle.textContent =
            "Unblock User";


        modalDescription.textContent =
            "Are you sure you want to unblock this user?";


        modalIcon.textContent =
            "✓";


        confirmActionBtn.textContent =
            "Unblock User";


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



blockUserBtn.addEventListener(
    "click",
    () => {

        if (!selectedUser) {

            return;

        }


        const action =
            selectedUser.isBlocked
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
            !selectedUser ||
            !pendingAction
        ) {

            return;

        }


        const token =
            getToken();


        if (!token) {

            redirectToLogin();

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
                    `/api/admin/users/${selectedUser._id}/block`,
                    {
                        method: "PATCH",

                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },

                        cache: "no-store",
                    }
                );


            const data =
                await response.json();




            if (response.status === 401) {

                redirectToLogin();

                return;

            }


            if (!response.ok) {

                throw new Error(
                    data.message ||
                    "Failed to update user status"
                );

            }


            selectedUser.isBlocked =
                data.isBlocked;


            updateStatus(
                selectedUser
            );


            closeActionModalWindow();


        } catch (error) {

            console.error(
                "Block/unblock user error:",
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
                        ? "Block User"
                        : "Unblock User";

            }

        }

    }
);





loadUser();