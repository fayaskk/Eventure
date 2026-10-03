const token =
  sessionStorage.getItem("token") ||
  localStorage.getItem("token");

if (!token) {
  window.location.replace("/login");
}

const profileInitial =
  document.getElementById("profileInitial");

const profileName =
  document.getElementById("profileName");

const profileEmail =
  document.getElementById("profileEmail");

const nameInput =
  document.getElementById("name");

const emailInput =
  document.getElementById("email");

const profileForm =
  document.getElementById("profileForm");

const passwordForm =
  document.getElementById("passwordForm");

const currentPassword =
  document.getElementById("currentPassword");

const newPassword =
  document.getElementById("newPassword");

const confirmPassword =
  document.getElementById("confirmPassword");

const newEmail =
  document.getElementById("newEmail");

const emailOtp =
  document.getElementById("emailOtp");

const otpSection =
  document.getElementById("otpSection");

const requestOtpBtn =
  document.getElementById("requestOtpBtn");

const resendOtpBtn =
  document.getElementById("resendOtpBtn");

const verifyOtpBtn =
  document.getElementById("verifyOtpBtn");

const saveProfileBtn =
  document.getElementById("saveProfileBtn");

const changePasswordBtn =
  document.getElementById("changePasswordBtn");

const OTP_RESEND_COOLDOWN =
  60 * 1000;

const OTP_RESEND_STORAGE_KEY =
  "adminEmailChangeResendAvailableAt";

let otpTimer = null;


async function apiRequest(url, options = {}) {
  const response =
    await fetch(url, {
      ...options,

      headers: {
        ...(options.headers || {}),

        Authorization:
          `Bearer ${token}`,
      },

      cache: "no-store",
    });

  if (
    response.status === 401 ||
    response.status === 403
  ) {
    sessionStorage.removeItem("token");
    localStorage.removeItem("token");

    window.location.replace("/login");

    return null;
  }

  let data = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      "Request failed"
    );
  }

  return data;
}


function validateName() {
  const name =
    nameInput.value.trim();

  if (!name) {
    showMessage(
      "Name is required.",
      "warning"
    );

    nameInput.focus();

    return false;
  }

  if (name.length < 2) {
    showMessage(
      "Name must contain at least 2 characters.",
      "warning"
    );

    nameInput.focus();

    return false;
  }

  if (name.length > 50) {
    showMessage(
      "Name must not exceed 50 characters.",
      "warning"
    );

    nameInput.focus();

    return false;
  }

  if (!/^[a-zA-Z\s.'-]+$/.test(name)) {
    showMessage(
      "Name can contain only letters, spaces, apostrophes, dots and hyphens.",
      "warning"
    );

    nameInput.focus();

    return false;
  }

  return true;
}


function validatePassword() {
  const current =
    currentPassword.value;

  const password =
    newPassword.value;

  const confirm =
    confirmPassword.value;

  if (!current) {
    showMessage(
      "Current password is required.",
      "warning"
    );

    currentPassword.focus();

    return false;
  }

  if (!password) {
    showMessage(
      "New password is required.",
      "warning"
    );

    newPassword.focus();

    return false;
  }

  if (password.length < 8) {
    showMessage(
      "Password must contain at least 8 characters.",
      "warning"
    );

    newPassword.focus();

    return false;
  }

  if (!/[A-Z]/.test(password)) {
    showMessage(
      "Password must contain at least one uppercase letter.",
      "warning"
    );

    newPassword.focus();

    return false;
  }

  if (!/[a-z]/.test(password)) {
    showMessage(
      "Password must contain at least one lowercase letter.",
      "warning"
    );

    newPassword.focus();

    return false;
  }

  if (!/[0-9]/.test(password)) {
    showMessage(
      "Password must contain at least one number.",
      "warning"
    );

    newPassword.focus();

    return false;
  }

  if (!confirm) {
    showMessage(
      "Please confirm your new password.",
      "warning"
    );

    confirmPassword.focus();

    return false;
  }

  if (password !== confirm) {
    showMessage(
      "Passwords do not match.",
      "warning"
    );

    confirmPassword.focus();

    return false;
  }

  return true;
}


function validateEmail() {
  const email =
    newEmail.value.trim().toLowerCase();

  if (!email) {
    showMessage(
      "New email is required.",
      "warning"
    );

    newEmail.focus();

    return false;
  }

  const emailRegex =
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  if (!emailRegex.test(email)) {
    showMessage(
      "Please enter a valid email address.",
      "warning"
    );

    newEmail.focus();

    return false;
  }

  const currentEmail =
    emailInput.value.trim().toLowerCase();

  if (
    currentEmail &&
    email === currentEmail
  ) {
    showMessage(
      "New email must be different from your current email.",
      "warning"
    );

    newEmail.focus();

    return false;
  }

  return true;
}


function validateOtp() {
  const otp =
    emailOtp.value.trim();

  if (!otp) {
    showMessage(
      "Verification OTP is required.",
      "warning"
    );

    emailOtp.focus();

    return false;
  }

  if (!/^\d{6}$/.test(otp)) {
    showMessage(
      "OTP must be exactly 6 digits.",
      "warning"
    );

    emailOtp.focus();

    return false;
  }

  return true;
}


function startOtpTimer() {
  clearInterval(otpTimer);

  const availableAt =
    Date.now() + OTP_RESEND_COOLDOWN;

  sessionStorage.setItem(
    OTP_RESEND_STORAGE_KEY,
    availableAt.toString()
  );

  updateOtpTimer();
}


function updateOtpTimer() {
  clearInterval(otpTimer);

  const availableAt =
    Number(
      sessionStorage.getItem(
        OTP_RESEND_STORAGE_KEY
      )
    );

  if (!availableAt) {
    enableResendOtp();

    return;
  }

  const update = () => {
    const remaining =
      availableAt - Date.now();

    if (remaining <= 0) {
      clearInterval(otpTimer);

      sessionStorage.removeItem(
        OTP_RESEND_STORAGE_KEY
      );

      enableResendOtp();

      return;
    }

    const seconds =
      Math.ceil(
        remaining / 1000
      );

    resendOtpBtn.disabled =
      true;

    resendOtpBtn.textContent =
      `Resend OTP (${seconds}s)`;
  };

  update();

  otpTimer =
    setInterval(
      update,
      1000
    );
}


function enableResendOtp() {
  resendOtpBtn.disabled =
    false;

  resendOtpBtn.textContent =
    "Resend OTP";
}


function resetOtpState() {
  clearInterval(otpTimer);

  sessionStorage.removeItem(
    OTP_RESEND_STORAGE_KEY
  );

  otpSection.style.display =
    "none";

  verifyOtpBtn.style.display =
    "none";

  resendOtpBtn.style.display =
    "none";

  requestOtpBtn.style.display =
    "inline-block";

  emailOtp.value =
    "";
}


function showOtpState() {
  otpSection.style.display =
    "block";

  verifyOtpBtn.style.display =
    "inline-block";

  resendOtpBtn.style.display =
    "inline-block";

  requestOtpBtn.style.display =
    "none";

  updateOtpTimer();
}


async function sendOtp() {
  if (!validateEmail()) {
    return;
  }

  const email =
    newEmail.value.trim().toLowerCase();

  try {
    requestOtpBtn.disabled =
      true;

    resendOtpBtn.disabled =
      true;

    requestOtpBtn.textContent =
      "Sending...";

    resendOtpBtn.textContent =
      "Sending...";

    const data =
      await apiRequest(
        "/api/admin/profile/request-email-change",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              newEmail: email,
            }),
        }
      );

    if (!data) {
      return;
    }

    showOtpState();

    startOtpTimer();

    showMessage(
      data.message ||
      "OTP sent successfully.",
      "success"
    );

    emailOtp.focus();

  } catch (error) {
    console.error(
      "Request email change error:",
      error
    );

    requestOtpBtn.disabled =
      false;

    resendOtpBtn.disabled =
      false;

    showMessage(
      error.message ||
      "Failed to send OTP.",
      "error"
    );

  } finally {
    requestOtpBtn.textContent =
      "Send OTP";
  }
}


async function resendOtp() {
  if (
    resendOtpBtn.disabled
  ) {
    return;
  }

  if (!validateEmail()) {
    return;
  }

  const email =
    newEmail.value.trim().toLowerCase();

  try {
    resendOtpBtn.disabled =
      true;

    resendOtpBtn.textContent =
      "Sending...";

    const data =
      await apiRequest(
        "/api/admin/profile/request-email-change",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body:
            JSON.stringify({
              newEmail: email,
            }),
        }
      );

    if (!data) {
      return;
    }

    startOtpTimer();

    showMessage(
      data.message ||
      "A new OTP has been sent.",
      "success"
    );

    emailOtp.focus();

  } catch (error) {
    console.error(
      "Resend email OTP error:",
      error
    );

    enableResendOtp();

    showMessage(
      error.message ||
      "Failed to resend OTP.",
      "error"
    );
  }
}


async function loadProfile() {
  try {
    const data =
      await apiRequest(
        "/api/admin/profile"
      );

    if (!data) {
      return;
    }

    const admin =
      data.data;

    profileName.textContent =
      admin.name || "-";

    profileEmail.textContent =
      admin.email || "-";

    nameInput.value =
      admin.name || "";

    emailInput.value =
      admin.email || "";

    profileInitial.textContent =
      admin.name
        ? admin.name.charAt(0).toUpperCase()
        : "A";

  } catch (error) {
    console.error(
      "Load admin profile error:",
      error
    );

    showMessage(
      error.message ||
      "Unable to load admin profile.",
      "error"
    );
  }
}


profileForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!validateName()) {
      return;
    }

    const name =
      nameInput.value.trim();

    try {
      saveProfileBtn.disabled =
        true;

      saveProfileBtn.textContent =
        "Saving...";

      const data =
        await apiRequest(
          "/api/admin/profile",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                name,
              }),
          }
        );

      if (!data) {
        return;
      }

      profileName.textContent =
        name;

      profileInitial.textContent =
        name.charAt(0).toUpperCase();

      showMessage(
        data.message ||
        "Profile updated successfully.",
        "success"
      );

    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      showMessage(
        error.message ||
        "Failed to update profile.",
        "error"
      );

    } finally {
      saveProfileBtn.disabled =
        false;

      saveProfileBtn.textContent =
        "Save Changes";
    }
  }
);


passwordForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!validatePassword()) {
      return;
    }

    try {
      changePasswordBtn.disabled =
        true;

      changePasswordBtn.textContent =
        "Changing...";

      const data =
        await apiRequest(
          "/api/admin/profile/change-password",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                currentPassword:
                  currentPassword.value,

                newPassword:
                  newPassword.value,

                confirmPassword:
                  confirmPassword.value,
              }),
          }
        );

      if (!data) {
        return;
      }

      passwordForm.reset();

      showMessage(
        data.message ||
        "Password changed successfully.",
        "success"
      );

    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      showMessage(
        error.message ||
        "Failed to change password.",
        "error"
      );

    } finally {
      changePasswordBtn.disabled =
        false;

      changePasswordBtn.textContent =
        "Change Password";
    }
  }
);


requestOtpBtn.addEventListener(
  "click",
  sendOtp
);


resendOtpBtn.addEventListener(
  "click",
  resendOtp
);


verifyOtpBtn.addEventListener(
  "click",
  async () => {
    if (!validateEmail()) {
      return;
    }

    if (!validateOtp()) {
      return;
    }

    const email =
      newEmail.value.trim().toLowerCase();

    const otp =
      emailOtp.value.trim();

    try {
      verifyOtpBtn.disabled =
        true;

      resendOtpBtn.disabled =
        true;

      verifyOtpBtn.textContent =
        "Verifying...";

      const data =
        await apiRequest(
          "/api/admin/profile/verify-email-change",
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                newEmail: email,
                otp,
              }),
          }
        );

      if (!data) {
        return;
      }

      emailInput.value =
        email;

      profileEmail.textContent =
        email;

      newEmail.value =
        "";

      emailOtp.value =
        "";

      resetOtpState();

      showMessage(
        data.message ||
        "Email updated successfully.",
        "success"
      );

    } catch (error) {
      console.error(
        "Verify email change error:",
        error
      );

      updateOtpTimer();

      showMessage(
        error.message ||
        "Email verification failed.",
        "error"
      );

    } finally {
      verifyOtpBtn.disabled =
        false;

      verifyOtpBtn.textContent =
        "Verify Email";
    }
  }
);


emailOtp.addEventListener(
  "input",
  () => {
    emailOtp.value =
      emailOtp.value
        .replace(/\D/g, "")
        .slice(0, 6);
  }
);


nameInput.addEventListener(
  "input",
  () => {
    if (typeof Swal !== "undefined") {
      Swal.close();
    }
  }
);


newEmail.addEventListener(
  "input",
  () => {
    if (
      otpSection.style.display ===
      "block"
    ) {
      clearInterval(otpTimer);

      sessionStorage.removeItem(
        OTP_RESEND_STORAGE_KEY
      );

      otpSection.style.display =
        "none";

      verifyOtpBtn.style.display =
        "none";

      resendOtpBtn.style.display =
        "none";

      requestOtpBtn.style.display =
        "inline-block";

      requestOtpBtn.disabled =
        false;

      requestOtpBtn.textContent =
        "Send OTP";

      emailOtp.value =
        "";
    }
  }
);


loadProfile();