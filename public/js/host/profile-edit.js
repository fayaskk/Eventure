(function () {
    const API_BASE = "/api/host/profile";

    const token = window.hostAuth?.getToken();

    if (!token) {
        return;
    }

    const organizationForm =
        document.getElementById("organizationForm");

    const contactForm =
        document.getElementById("contactForm");

    const bankForm =
        document.getElementById("bankForm");

    function authHeaders() {
        return {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
        };
    }

    async function apiRequest(url, options = {}) {
        const response = await fetch(url, {
            ...options,
            headers: {
                ...authHeaders(),
                ...(options.headers || {})
            },
            cache: "no-store"
        });

        const text = await response.text();

        let data = {};

        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            throw new Error(
                `Server returned an invalid response (${response.status})`
            );
        }

        if (response.status === 401 || response.status === 403) {
            window.hostAuth?.logout();
            return null;
        }

        if (!response.ok) {
            throw new Error(
                data.message || "Request failed"
            );
        }

        return data;
    }

    async function loadProfile() {
        try {
            const data = await apiRequest(API_BASE);

            if (!data) {
                return;
            }

            const profile = data.profile;

            if (!profile) {
                throw new Error(
                    "Profile data was not returned by the server"
                );
            }

            document.getElementById("organizationName").value =
                profile.organization?.organizationName || "";

            document.getElementById("organizationType").value =
                profile.organization?.organizationType || "";

            document.getElementById("website").value =
                profile.organization?.website || "";

            document.getElementById("description").value =
                profile.organization?.description || "";

            document.getElementById("primaryContactName").value =
                profile.contactDetails?.primaryContactName || "";

            document.getElementById("contactEmail").value =
                profile.contactDetails?.email || "";

            document.getElementById("phoneNumber").value =
                profile.contactDetails?.phoneNumber || "";

            document.getElementById("officeAddress").value =
                profile.contactDetails?.officeAddress || "";

            document.getElementById("bankName").value =
                profile.bankDetails?.bankName || "";

            document.getElementById("bankAccountName").value =
                profile.bankDetails?.accountHolderName || "";

            document.getElementById("bankAccountNumber").value =
                profile.bankDetails?.accountNumber || "";

            document.getElementById("ifscCode").value =
                profile.bankDetails?.ifscCode || "";
        } catch (error) {
            console.error(
                "Load host profile error:",
                error
            );

            showMessage(
                error.message || "Unable to load profile.",
                "error"
            );
        }
    }

    organizationForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const organizationName =
            document.getElementById("organizationName")
                .value
                .trim();

        const organizationType =
            document.getElementById("organizationType")
                .value
                .trim();

        const website =
            document.getElementById("website")
                .value
                .trim();

        const description =
            document.getElementById("description")
                .value
                .trim();

        if (!organizationName) {
            showMessage(
                "Organization name is required.",
                "warning"
            );

            document.getElementById("organizationName").focus();

            return;
        }

        if (!organizationType) {
            showMessage(
                "Please select an organization type.",
                "warning"
            );

            document.getElementById("organizationType").focus();

            return;
        }

        if (!description) {
            showMessage(
                "Organization description is required.",
                "warning"
            );

            document.getElementById("description").focus();

            return;
        }

        if (website) {
            const websiteRegex =
                /^https?:\/\/.+/i;

            if (!websiteRegex.test(website)) {
                showMessage(
                    "Please enter a valid website URL.",
                    "warning"
                );

                document.getElementById("website").focus();

                return;
            }
        }

        const button =
            document.getElementById("saveOrganizationBtn");

        button.disabled = true;
        button.textContent = "Saving...";

        try {
            const data = await apiRequest(
                API_BASE,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        organizationName,
                        organizationType,
                        website,
                        description
                    })
                }
            );

            if (!data) {
                return;
            }

            showMessage(
                data.message ||
                "Organization details updated successfully.",
                "success"
            );
        } catch (error) {
            showMessage(
                error.message ||
                "Unable to update organization details.",
                "error"
            );
        } finally {
            button.disabled = false;
            button.textContent = "Save Changes";
        }
    });

    contactForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const primaryContactName =
            document.getElementById("primaryContactName")
                .value
                .trim();

        const contactEmail =
            document.getElementById("contactEmail")
                .value
                .trim()
                .toLowerCase();

        const phoneNumber =
            document.getElementById("phoneNumber")
                .value
                .trim();

        const officeAddress =
            document.getElementById("officeAddress")
                .value
                .trim();

        if (!primaryContactName) {
            showMessage(
                "Primary contact name is required.",
                "warning"
            );

            document.getElementById("primaryContactName").focus();

            return;
        }

        if (!contactEmail) {
            showMessage(
                "Organization contact email is required.",
                "warning"
            );

            document.getElementById("contactEmail").focus();

            return;
        }

        const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

        if (!emailRegex.test(contactEmail)) {
            showMessage(
                "Please enter a valid organization contact email.",
                "warning"
            );

            document.getElementById("contactEmail").focus();

            return;
        }

        if (!phoneNumber) {
            showMessage(
                "Phone number is required.",
                "warning"
            );

            document.getElementById("phoneNumber").focus();

            return;
        }

        if (!officeAddress) {
            showMessage(
                "Office address is required.",
                "warning"
            );

            document.getElementById("officeAddress").focus();

            return;
        }

        const button =
            document.getElementById("saveContactBtn");

        button.disabled = true;
        button.textContent = "Saving...";

        try {
            const data = await apiRequest(
                API_BASE,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        contactDetails: {
                            primaryContactName,
                            email: contactEmail,
                            phoneNumber,
                            officeAddress
                        }
                    })
                }
            );

            if (!data) {
                return;
            }

            showMessage(
                data.message ||
                "Contact details updated successfully.",
                "success"
            );
        } catch (error) {
            showMessage(
                error.message ||
                "Unable to update contact details.",
                "error"
            );
        } finally {
            button.disabled = false;
            button.textContent = "Save Changes";
        }
    });

    bankForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const bankName =
            document.getElementById("bankName")
                .value
                .trim();

        const bankAccountName =
            document.getElementById("bankAccountName")
                .value
                .trim();

        const bankAccountNumber =
            document.getElementById("bankAccountNumber")
                .value
                .trim();

        const ifscCode =
            document.getElementById("ifscCode")
                .value
                .trim()
                .toUpperCase();

        if (!bankName) {
            showMessage(
                "Bank name is required.",
                "warning"
            );

            document.getElementById("bankName").focus();

            return;
        }

        if (!bankAccountName) {
            showMessage(
                "Account holder name is required.",
                "warning"
            );

            document.getElementById("bankAccountName").focus();

            return;
        }

        if (!bankAccountNumber) {
            showMessage(
                "Account number is required.",
                "warning"
            );

            document.getElementById("bankAccountNumber").focus();

            return;
        }

        if (!ifscCode) {
            showMessage(
                "IFSC code is required.",
                "warning"
            );

            document.getElementById("ifscCode").focus();

            return;
        }

        const button =
            document.getElementById("saveBankBtn");

        button.disabled = true;
        button.textContent = "Saving...";

        try {
            const data = await apiRequest(
                API_BASE,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        bankName,
                        bankAccountName,
                        bankAccountNumber,
                        ifscCode
                    })
                }
            );

            if (!data) {
                return;
            }

            showMessage(
                data.message ||
                "Bank details updated successfully.",
                "success"
            );
        } catch (error) {
            showMessage(
                error.message ||
                "Unable to update bank details.",
                "error"
            );
        } finally {
            button.disabled = false;
            button.textContent = "Save Changes";
        }
    });

    loadProfile();
})();