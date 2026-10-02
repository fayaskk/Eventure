const token = getToken();

const redirectToLogin = () => {
  localStorage.removeItem("token");
  sessionStorage.removeItem("token");

  window.location.href = "/login";
};

const profileForm = document.getElementById("profileForm");

const nameInput = document.getElementById("name");

const languageSelect = document.getElementById("language");

const emailRequestForm = document.getElementById("emailRequestForm");

const newEmailInput = document.getElementById("newEmail");

const emailVerifyForm = document.getElementById("emailVerifyForm");

const emailOtpInput = document.getElementById("emailOtp");

const resendEmailOtpBtn = document.getElementById("resendEmailOtpBtn");

const EMAIL_OTP_COOLDOWN = 60;

const EMAIL_OTP_RESEND_KEY = "changeEmailResendAvailableAt";

const EMAIL_OTP_PENDING_EMAIL_KEY = "changeEmailPendingAddress";

let currentNewEmail = sessionStorage.getItem(EMAIL_OTP_PENDING_EMAIL_KEY) || "";

let emailOtpTimerInterval = null;

const passwordForm = document.getElementById("passwordForm");

const currentPasswordInput = document.getElementById("currentPassword");

const newPasswordInput = document.getElementById("newPassword");

const confirmPasswordInput = document.getElementById("confirmPassword");

const passwordSection = document.getElementById("passwordSection");

let isGoogleUser = false;

const loadProfile = async () => {
  try {
    if (!token) {
      redirectToLogin();
      return;
    }

    const response = await fetch("/api/users/profile", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      throw new Error(result.message || "Failed to load profile");
    }

    const user = result.data;

    nameInput.value = user.name || "";

    languageSelect.value = user.language || "English";

    isGoogleUser = user.isGoogleUser === true;

    if (isGoogleUser) {
      passwordSection.style.display = "none";
    }
  } catch (error) {
    console.error("Load profile error:", error);

    showMessage(error.message || "Unable to load your profile.", "error");
  }
};

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const name = nameInput.value.trim();

  const language = languageSelect.value;

  if (!name) {
    showMessage("Name is required.", "warning");

    nameInput.focus();

    return;
  }

  if (name.length < 2) {
    showMessage("Name must be at least 2 characters.", "warning");

    nameInput.focus();

    return;
  }

  if (!language) {
    showMessage("Please select a language.", "warning");

    languageSelect.focus();

    return;
  }

  const submitButton = profileForm.querySelector(".primary-btn");

  try {
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }

    const response = await fetch("/api/users/profile", {
      method: "PATCH",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        name,
        language,
      }),
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      showMessage(result.message || "Failed to update profile.", "error");

      return;
    }

    showMessage(result.message || "Profile updated successfully.", "success");
  } catch (error) {
    console.error("Profile update error:", error);

    showMessage("Something went wrong. Please try again.", "error");
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Save Changes";
    }
  }
});

const startEmailOtpTimer = () => {
  if (!resendEmailOtpBtn) {
    return;
  }

  if (emailOtpTimerInterval) {
    clearInterval(emailOtpTimerInterval);
  }

  const availableAt = Number(sessionStorage.getItem(EMAIL_OTP_RESEND_KEY));

  if (!availableAt) {
    resendEmailOtpBtn.disabled = false;
    resendEmailOtpBtn.textContent = "Resend OTP";

    return;
  }

  const updateTimer = () => {
    const remaining = Math.ceil((availableAt - Date.now()) / 1000);

    if (remaining <= 0) {
      clearInterval(emailOtpTimerInterval);

      emailOtpTimerInterval = null;

      resendEmailOtpBtn.disabled = false;

      resendEmailOtpBtn.textContent = "Resend OTP";

      sessionStorage.removeItem(EMAIL_OTP_RESEND_KEY);

      return;
    }

    resendEmailOtpBtn.disabled = true;

    resendEmailOtpBtn.innerHTML = `Resend OTP in <span>${remaining}</span>s`;
  };

  updateTimer();

  emailOtpTimerInterval = setInterval(updateTimer, 1000);
};

const startEmailOtpCooldown = () => {
  const availableAt = Date.now() + EMAIL_OTP_COOLDOWN * 1000;

  sessionStorage.setItem(EMAIL_OTP_RESEND_KEY, availableAt);

  startEmailOtpTimer();
};

emailRequestForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const newEmail = newEmailInput.value.trim();

  if (!newEmail) {
    showMessage("Email is required.", "warning");

    newEmailInput.focus();

    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(newEmail)) {
    showMessage("Please enter a valid email address.", "warning");

    newEmailInput.focus();

    return;
  }

  const requestButton = emailRequestForm.querySelector(".secondary-btn");

  try {
    if (requestButton) {
      requestButton.disabled = true;
      requestButton.textContent = "Sending...";
    }

    const response = await fetch("/api/users/change-email/request", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        newEmail,
      }),
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      showMessage(
        result.message || "Failed to send verification code.",
        "error",
      );

      return;
    }

    currentNewEmail = newEmail;

    sessionStorage.setItem(EMAIL_OTP_PENDING_EMAIL_KEY, newEmail);

    emailVerifyForm.classList.remove("hidden");

    startEmailOtpCooldown();

    showMessage(
      result.message || "Verification code sent to your new email.",
      "success",
    );
  } catch (error) {
    console.error("Email change request error:", error);

    showMessage("Something went wrong. Please try again.", "error");
  } finally {
    if (requestButton) {
      requestButton.disabled = false;
      requestButton.textContent = "Send Verification Code";
    }
  }
});

resendEmailOtpBtn?.addEventListener("click", async () => {
  if (resendEmailOtpBtn.disabled || !currentNewEmail) {
    return;
  }

  resendEmailOtpBtn.disabled = true;

  resendEmailOtpBtn.textContent = "Sending...";

  try {
    const response = await fetch("/api/users/change-email/request", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        newEmail: currentNewEmail,
      }),
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      showMessage(
        result.message || "Failed to resend verification code.",
        "error",
      );

      resendEmailOtpBtn.disabled = false;

      resendEmailOtpBtn.textContent = "Resend OTP";

      return;
    }

    startEmailOtpCooldown();

    showMessage(
      result.message || "A new verification code has been sent.",
      "success",
    );
  } catch (error) {
    console.error("Resend email OTP error:", error);

    resendEmailOtpBtn.disabled = false;

    resendEmailOtpBtn.textContent = "Resend OTP";

    showMessage("Something went wrong. Please try again.", "error");
  }
});

emailVerifyForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const otp = emailOtpInput.value.trim();

  if (!otp) {
    showMessage("Please enter the verification code.", "warning");

    emailOtpInput.focus();

    return;
  }

  if (!/^\d{6}$/.test(otp)) {
    showMessage("Please enter a valid 6-digit OTP.", "warning");

    emailOtpInput.focus();

    return;
  }

  if (!currentNewEmail) {
    showMessage("Please request a new verification code.", "warning");

    return;
  }

  const verifyButton = emailVerifyForm.querySelector(".primary-btn");

  try {
    if (verifyButton) {
      verifyButton.disabled = true;
      verifyButton.textContent = "Verifying...";
    }

    const response = await fetch("/api/users/change-email/verify", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        newEmail: currentNewEmail,

        otp,
      }),
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      showMessage(result.message || "Email verification failed.", "error");

      return;
    }

    showMessage(result.message || "Email changed successfully.", "success");

    emailVerifyForm.classList.add("hidden");

    emailRequestForm.reset();

    emailVerifyForm.reset();

    currentNewEmail = "";

    sessionStorage.removeItem(EMAIL_OTP_PENDING_EMAIL_KEY);

    sessionStorage.removeItem(EMAIL_OTP_RESEND_KEY);

    if (emailOtpTimerInterval) {
      clearInterval(emailOtpTimerInterval);

      emailOtpTimerInterval = null;
    }

    if (resendEmailOtpBtn) {
      resendEmailOtpBtn.disabled = true;

      resendEmailOtpBtn.textContent = "Resend OTP";
    }
  } catch (error) {
    console.error("Email verification error:", error);

    showMessage("Something went wrong. Please try again.", "error");
  } finally {
    if (verifyButton) {
      verifyButton.disabled = false;
      verifyButton.textContent = "Verify & Change Email";
    }
  }
});

emailOtpInput.addEventListener("input", (event) => {
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 6);
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isGoogleUser) {
    showMessage(
      "Google accounts cannot change their password here.",
      "warning",
    );

    return;
  }

  const currentPassword = currentPasswordInput.value;

  const newPassword = newPasswordInput.value;

  const confirmPassword = confirmPasswordInput.value;

  if (!currentPassword) {
    showMessage("Current password is required.", "warning");

    currentPasswordInput.focus();

    return;
  }

  if (!newPassword) {
    showMessage("New password is required.", "warning");

    newPasswordInput.focus();

    return;
  }

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

  if (!strongPassword.test(newPassword)) {
    showMessage(
      "Password must contain uppercase, lowercase, number and minimum 8 characters.",
      "warning",
    );

    newPasswordInput.focus();

    return;
  }

  if (!confirmPassword) {
    showMessage("Please confirm your new password.", "warning");

    confirmPasswordInput.focus();

    return;
  }

  if (newPassword !== confirmPassword) {
    showMessage("Passwords do not match.", "warning");

    confirmPasswordInput.focus();

    return;
  }

  const changePasswordButton = passwordForm.querySelector(".primary-btn");

  try {
    if (changePasswordButton) {
      changePasswordButton.disabled = true;

      changePasswordButton.textContent = "Changing...";
    }

    const response = await fetch("/api/users/change-password", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",

        Authorization: `Bearer ${token}`,
      },

      body: JSON.stringify({
        currentPassword,
        newPassword,
        confirmPassword,
      }),
    });

    const result = await response.json();

    if (response.status === 401 || response.status === 403) {
      redirectToLogin();
      return;
    }

    if (!response.ok) {
      showMessage(result.message || "Failed to change password.", "error");

      return;
    }

    showMessage(result.message || "Password changed successfully.", "success");

    passwordForm.reset();
  } catch (error) {
    console.error("Change password error:", error);

    showMessage("Something went wrong. Please try again.", "error");
  } finally {
    if (changePasswordButton) {
      changePasswordButton.disabled = false;

      changePasswordButton.textContent = "Change Password";
    }
  }
});

const pendingEmail = sessionStorage.getItem(EMAIL_OTP_PENDING_EMAIL_KEY);

if (pendingEmail) {
  currentNewEmail = pendingEmail;

  newEmailInput.value = pendingEmail;

  emailVerifyForm.classList.remove("hidden");

  const resendAvailableAt = Number(
    sessionStorage.getItem(EMAIL_OTP_RESEND_KEY),
  );

  if (resendAvailableAt && resendAvailableAt > Date.now()) {
    startEmailOtpTimer();
  } else if (resendEmailOtpBtn) {
    sessionStorage.removeItem(EMAIL_OTP_RESEND_KEY);

    resendEmailOtpBtn.disabled = false;

    resendEmailOtpBtn.textContent = "Resend OTP";
  }
}

loadProfile();