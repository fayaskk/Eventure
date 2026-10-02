(function () {
  const API_BASE = "/api/host/profile";

  const token =
    localStorage.getItem("token") ||
    sessionStorage.getItem("token");

  if (!token) {
    return;
  }

  const EMAIL_OTP_COOLDOWN = 60;

  const EMAIL_OTP_RESEND_KEY =
    "hostProfileEmailResendAvailableAt";

  const EMAIL_OTP_PENDING_EMAIL_KEY =
    "hostProfilePendingEmail";

  let emailOtpTimerInterval = null;

  let currentNewEmail =
    sessionStorage.getItem(
      EMAIL_OTP_PENDING_EMAIL_KEY
    ) || "";

  function authHeaders() {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    };
  }

  async function apiRequest(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...authHeaders(),
        ...(options.headers || {}),
      },
      cache: "no-store",
    });

    const text = await response.text();

    let data = {};

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new Error(
        `Server returned an invalid response (${response.status})`,
      );
    }

    if (
      response.status === 401 ||
      response.status === 403
    ) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      window.location.replace(
        "/login"
      );

      return null;
    }

    if (!response.ok) {
      throw new Error(
        data.message || "Request failed"
      );
    }

    return data;
  }

  function setText(id, value) {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        value || "-";
    }
  }

  function openModal(id) {
    document
      .getElementById(id)
      .classList.remove("hidden");
  }

  function closeModal(id) {
    document
      .getElementById(id)
      .classList.add("hidden");
  }

  const startEmailOtpTimer = () => {
    const resendEmailOtpBtn =
      document.getElementById(
        "resendEmailOtpBtn"
      );

    if (!resendEmailOtpBtn) {
      return;
    }

    if (emailOtpTimerInterval) {
      clearInterval(
        emailOtpTimerInterval
      );
    }

    const availableAt =
      Number(
        sessionStorage.getItem(
          EMAIL_OTP_RESEND_KEY
        )
      );

    if (!availableAt) {
      resendEmailOtpBtn.disabled =
        false;

      resendEmailOtpBtn.textContent =
        "Resend OTP";

      return;
    }

    const updateTimer = () => {
      const remaining =
        Math.ceil(
          (availableAt - Date.now()) /
            1000
        );

      if (remaining <= 0) {
        clearInterval(
          emailOtpTimerInterval
        );

        emailOtpTimerInterval = null;

        resendEmailOtpBtn.disabled =
          false;

        resendEmailOtpBtn.textContent =
          "Resend OTP";

        sessionStorage.removeItem(
          EMAIL_OTP_RESEND_KEY
        );

        return;
      }

      resendEmailOtpBtn.disabled =
        true;

      resendEmailOtpBtn.textContent =
        `Resend OTP in ${remaining}s`;
    };

    updateTimer();

    emailOtpTimerInterval =
      setInterval(
        updateTimer,
        1000
      );
  };

  const startEmailOtpCooldown = () => {
    const availableAt =
      Date.now() +
      EMAIL_OTP_COOLDOWN * 1000;

    sessionStorage.setItem(
      EMAIL_OTP_RESEND_KEY,
      availableAt
    );

    startEmailOtpTimer();
  };

  const clearEmailOtpState = () => {
    currentNewEmail = "";

    sessionStorage.removeItem(
      EMAIL_OTP_PENDING_EMAIL_KEY
    );

    sessionStorage.removeItem(
      EMAIL_OTP_RESEND_KEY
    );

    if (emailOtpTimerInterval) {
      clearInterval(
        emailOtpTimerInterval
      );

      emailOtpTimerInterval = null;
    }

    const resendEmailOtpBtn =
      document.getElementById(
        "resendEmailOtpBtn"
      );

    if (resendEmailOtpBtn) {
      resendEmailOtpBtn.disabled =
        true;

      resendEmailOtpBtn.textContent =
        "Resend OTP";
    }
  };

  async function loadProfile() {
    try {
      const data =
        await apiRequest(API_BASE);

      if (!data) {
        return;
      }

      const profile =
        data.profile;

      if (!profile) {
        throw new Error(
          "Profile data was not returned by the server"
        );
      }

      const name =
        profile.name || "-";

      const email =
        profile.email || "-";

      setText(
        "profileName",
        name
      );

      setText(
        "profileEmail",
        email
      );

      setText(
        "detailName",
        name
      );

      setText(
        "detailEmail",
        email
      );

      setText(
        "organizationName",
        profile.organization
          ?.organizationName
      );

      setText(
        "organizationType",
        profile.organization
          ?.organizationType
      );

      setText(
        "website",
        profile.organization?.website
      );

      setText(
        "description",
        profile.organization?.description
      );

      setText(
        "primaryContactName",
        profile.contactDetails
          ?.primaryContactName
      );

      setText(
        "contactEmail",
        profile.contactDetails?.email
      );

      setText(
        "phoneNumber",
        profile.contactDetails?.phoneNumber
      );

      setText(
        "officeAddress",
        profile.contactDetails?.officeAddress
      );

      setText(
        "bankName",
        profile.bankDetails?.bankName
      );

      setText(
        "bankAccountName",
        profile.bankDetails
          ?.accountHolderName
      );

      setText(
        "bankAccountNumber",
        profile.bankDetails
          ?.accountNumber
      );

      setText(
        "ifscCode",
        profile.bankDetails?.ifscCode
      );

      const initial =
        document.getElementById(
          "profileInitial"
        );

      if (initial) {
        initial.textContent =
          profile.name
            ? profile.name
                .charAt(0)
                .toUpperCase()
            : "H";
      }
    } catch (error) {
      console.error(
        "Host profile error:",
        error
      );

      showMessage(
        error.message ||
          "Unable to load profile.",
        "error"
      );
    }
  }

  async function changePassword() {
    const currentPassword =
      document.getElementById(
        "currentPassword"
      ).value;

    const newPassword =
      document.getElementById(
        "newPassword"
      ).value;

    const confirmPassword =
      document.getElementById(
        "confirmPassword"
      ).value;

    if (!currentPassword) {
      showMessage(
        "Current password is required.",
        "warning"
      );

      document
        .getElementById("currentPassword")
        .focus();

      return;
    }

    if (!newPassword) {
      showMessage(
        "New password is required.",
        "warning"
      );

      document
        .getElementById("newPassword")
        .focus();

      return;
    }

    if (newPassword.length < 8) {
      showMessage(
        "Password must contain at least 8 characters.",
        "warning"
      );

      document
        .getElementById("newPassword")
        .focus();

      return;
    }

    if (!/[A-Z]/.test(newPassword)) {
      showMessage(
        "Password must contain at least one uppercase letter.",
        "warning"
      );

      document
        .getElementById("newPassword")
        .focus();

      return;
    }

    if (!/[a-z]/.test(newPassword)) {
      showMessage(
        "Password must contain at least one lowercase letter.",
        "warning"
      );

      document
        .getElementById("newPassword")
        .focus();

      return;
    }

    if (!/[0-9]/.test(newPassword)) {
      showMessage(
        "Password must contain at least one number.",
        "warning"
      );

      document
        .getElementById("newPassword")
        .focus();

      return;
    }

    if (!confirmPassword) {
      showMessage(
        "Please confirm your new password.",
        "warning"
      );

      document
        .getElementById("confirmPassword")
        .focus();

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      showMessage(
        "Passwords do not match.",
        "warning"
      );

      document
        .getElementById("confirmPassword")
        .focus();

      return;
    }

    const button =
      document.getElementById(
        "submitPasswordBtn"
      );

    button.disabled = true;
    button.textContent =
      "Updating...";

    try {
      const data =
        await apiRequest(
          `${API_BASE}/change-password`,
          {
            method: "PATCH",
            body: JSON.stringify({
              currentPassword,
              newPassword,
              confirmPassword,
            }),
          }
        );

      if (!data) {
        return;
      }

      showMessage(
        data.message ||
          "Password changed successfully.",
        "success"
      );

      document.getElementById(
        "currentPassword"
      ).value = "";

      document.getElementById(
        "newPassword"
      ).value = "";

      document.getElementById(
        "confirmPassword"
      ).value = "";

      closeModal(
        "passwordModal"
      );
    } catch (error) {
      showMessage(
        error.message ||
          "Unable to change password.",
        "error"
      );
    } finally {
      button.disabled = false;

      button.textContent =
        "Update Password";
    }
  }

  async function requestEmailOTP() {
    const newEmail =
      document
        .getElementById("newEmail")
        .value
        .trim()
        .toLowerCase();

    if (!newEmail) {
      showMessage(
        "Please enter your new email address.",
        "warning"
      );

      document
        .getElementById("newEmail")
        .focus();

      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailRegex.test(newEmail)) {
      showMessage(
        "Please enter a valid email address.",
        "warning"
      );

      document
        .getElementById("newEmail")
        .focus();

      return;
    }

    const button =
      document.getElementById(
        "requestEmailOtpBtn"
      );

    button.disabled = true;
    button.textContent =
      "Sending...";

    try {
      const data =
        await apiRequest(
          `${API_BASE}/request-email-change`,
          {
            method: "POST",
            body: JSON.stringify({
              newEmail,
            }),
          }
        );

      if (!data) {
        return;
      }

      currentNewEmail =
        newEmail;

      sessionStorage.setItem(
        EMAIL_OTP_PENDING_EMAIL_KEY,
        newEmail
      );

      showMessage(
        data.message ||
          "OTP sent successfully.",
        "success"
      );

      document
        .getElementById("emailStepOne")
        .classList.add("hidden");

      document
        .getElementById("emailStepTwo")
        .classList.remove("hidden");

      startEmailOtpCooldown();

      document
        .getElementById("emailOtp")
        .focus();
    } catch (error) {
      showMessage(
        error.message ||
          "Unable to send OTP.",
        "error"
      );
    } finally {
      button.disabled = false;

      button.textContent =
        "Send OTP";
    }
  }

  async function resendEmailOTP() {
    const resendEmailOtpBtn =
      document.getElementById(
        "resendEmailOtpBtn"
      );

    if (
      resendEmailOtpBtn.disabled ||
      !currentNewEmail
    ) {
      return;
    }

    resendEmailOtpBtn.disabled =
      true;

    resendEmailOtpBtn.textContent =
      "Sending...";

    try {
      const data =
        await apiRequest(
          `${API_BASE}/request-email-change`,
          {
            method: "POST",
            body: JSON.stringify({
              newEmail:
                currentNewEmail,
            }),
          }
        );

      if (!data) {
        return;
      }

      startEmailOtpCooldown();

      showMessage(
        data.message ||
          "A new verification code has been sent.",
        "success"
      );
    } catch (error) {
      resendEmailOtpBtn.disabled =
        false;

      resendEmailOtpBtn.textContent =
        "Resend OTP";

      showMessage(
        error.message ||
          "Unable to resend OTP.",
        "error"
      );
    }
  }

  async function verifyEmailOTP() {
    const newEmail =
      document
        .getElementById("newEmail")
        .value
        .trim()
        .toLowerCase();

    const otp =
      document
        .getElementById("emailOtp")
        .value
        .trim();

    if (!currentNewEmail) {
      showMessage(
        "Please request a new verification code.",
        "warning"
      );

      return;
    }

    if (!otp) {
      showMessage(
        "Please enter the verification OTP.",
        "warning"
      );

      document
        .getElementById("emailOtp")
        .focus();

      return;
    }

    if (!/^\d{6}$/.test(otp)) {
      showMessage(
        "OTP must be exactly 6 digits.",
        "warning"
      );

      document
        .getElementById("emailOtp")
        .focus();

      return;
    }

    const button =
      document.getElementById(
        "verifyEmailOtpBtn"
      );

    button.disabled = true;

    button.textContent =
      "Verifying...";

    try {
      const data =
        await apiRequest(
          `${API_BASE}/verify-email-change`,
          {
            method: "PATCH",
            body: JSON.stringify({
              newEmail:
                currentNewEmail,
              otp,
            }),
          }
        );

      if (!data) {
        return;
      }

      showMessage(
        data.message ||
          "Email updated successfully.",
        "success"
      );

      setText(
        "profileEmail",
        currentNewEmail
      );

      setText(
        "detailEmail",
        currentNewEmail
      );

      clearEmailOtpState();

      setTimeout(() => {
        closeModal(
          "emailModal"
        );

        document
          .getElementById("emailStepOne")
          .classList.remove("hidden");

        document
          .getElementById("emailStepTwo")
          .classList.add("hidden");

        document.getElementById(
          "newEmail"
        ).value = "";

        document.getElementById(
          "emailOtp"
        ).value = "";
      }, 1000);
    } catch (error) {
      showMessage(
        error.message ||
          "Invalid OTP.",
        "error"
      );
    } finally {
      button.disabled = false;

      button.textContent =
        "Verify & Update Email";
    }
  }

  document
    .getElementById(
      "changePasswordBtn"
    )
    .addEventListener(
      "click",
      () => {
        openModal(
          "passwordModal"
        );
      }
    );

  document
    .getElementById(
      "changeEmailBtn"
    )
    .addEventListener(
      "click",
      () => {
        openModal(
          "emailModal"
        );

        const pendingEmail =
          sessionStorage.getItem(
            EMAIL_OTP_PENDING_EMAIL_KEY
          );

        const resendAvailableAt =
          Number(
            sessionStorage.getItem(
              EMAIL_OTP_RESEND_KEY
            )
          );

        if (pendingEmail) {
          currentNewEmail =
            pendingEmail;

          document.getElementById(
            "newEmail"
          ).value =
            pendingEmail;

          document
            .getElementById("emailStepOne")
            .classList.add("hidden");

          document
            .getElementById("emailStepTwo")
            .classList.remove("hidden");

          if (
            resendAvailableAt &&
            resendAvailableAt >
              Date.now()
          ) {
            startEmailOtpTimer();
          } else {
            sessionStorage.removeItem(
              EMAIL_OTP_RESEND_KEY
            );

            const resendEmailOtpBtn =
              document.getElementById(
                "resendEmailOtpBtn"
              );

            if (resendEmailOtpBtn) {
              resendEmailOtpBtn.disabled =
                false;

              resendEmailOtpBtn.textContent =
                "Resend OTP";
            }
          }

          document
            .getElementById("emailOtp")
            .focus();
        }
      }
    );

  document
    .getElementById(
      "submitPasswordBtn"
    )
    .addEventListener(
      "click",
      changePassword
    );

  document
    .getElementById(
      "requestEmailOtpBtn"
    )
    .addEventListener(
      "click",
      requestEmailOTP
    );

  document
    .getElementById(
      "resendEmailOtpBtn"
    )
    .addEventListener(
      "click",
      resendEmailOTP
    );

  document
    .getElementById(
      "verifyEmailOtpBtn"
    )
    .addEventListener(
      "click",
      verifyEmailOTP
    );

  document
    .querySelectorAll(
      ".close-modal"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          closeModal(
            button.dataset.close
          );
        }
      );
    });

  document
    .querySelectorAll(".modal")
    .forEach((modal) => {
      modal.addEventListener(
        "click",
        (event) => {
          if (
            event.target === modal
          ) {
            closeModal(
              modal.id
            );
          }
        }
      );
    });

  document
    .getElementById("emailOtp")
    .addEventListener(
      "input",
      (event) => {
        event.target.value =
          event.target.value
            .replace(/\D/g, "")
            .slice(0, 6);
      }
    );

  loadProfile();
})();