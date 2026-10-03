const googleAuthButton =
  document.getElementById("googleAuthBtn");

if (googleAuthButton) {
  googleAuthButton.addEventListener("click", () => {
    const width = 500;
    const height = 600;

    const left =
      window.screenX +
      (window.outerWidth - width) / 2;

    const top =
      window.screenY +
      (window.outerHeight - height) / 2;

    const googleWindow = window.open(
      "/api/auth/google",
      "googleAuth",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!googleWindow) {
      showMessage(
        "Please allow popups for Eventure to continue with Google.",
        "error"
      );

      return;
    }

    googleWindow.focus();
  });
}

window.addEventListener("message", (event) => {
  if (event.origin !== window.location.origin) {
    return;
  }

  const data = event.data;

  if (!data) {
    return;
  }

  if (data.type === "google-auth-error") {
    if (data.error === "blocked") {
      showMessage(
        "Your account has been blocked.",
        "error"
      );
    } else if (data.error === "deleted") {
      showMessage(
        "This account has been deleted.",
        "error"
      );
    } else {
      showMessage(
        "Google authentication failed. Please try again.",
        "error"
      );
    }

    return;
  }

  if (data.type !== "google-auth-success") {
    return;
  }

  const token = data.token;

  if (!token) {
    showMessage(
      "Google authentication failed. Please try again.",
      "error"
    );

    return;
  }

  sessionStorage.setItem(
    "token",
    token
  );

  try {
    const tokenParts =
      token.split(".");

    if (tokenParts.length !== 3) {
      throw new Error(
        "Invalid JWT format"
      );
    }

    let payloadString =
      tokenParts[1];

    payloadString =
      payloadString
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (
      payloadString.length % 4
    ) {
      payloadString += "=";
    }

    const payload =
      JSON.parse(
        atob(payloadString)
      );

    if (payload.role === "admin") {
      window.location.replace(
        "/admin/dashboard"
      );
    } else if (
      payload.role === "host"
    ) {
      window.location.replace(
        "/host/dashboard"
      );
    } else {
      window.location.replace(
        "/dashboard"
      );
    }
  } catch (error) {
    console.error(
      "Google token processing error:",
      error
    );

    sessionStorage.removeItem(
      "token"
    );

    showMessage(
      "Google authentication failed. Please try again.",
      "error"
    );
  }
});

const registerForm =
  document.getElementById("registerForm");

if (registerForm) {
  const nameInput =
    document.getElementById("name");

  const emailInput =
    document.getElementById("email");

  const passwordInput =
    document.getElementById("password");

  const confirmPasswordInput =
    document.getElementById("confirmPassword");

  const referralCodeInput =
    document.getElementById("referralCode");

  const termsInput =
    document.getElementById("terms");

  function removeError(field) {
    if (!field) {
      return;
    }

    field.classList.remove("input-error");

    field.classList.remove("input-success");

    const error =
      field.parentElement?.querySelector(
        ".form-error"
      );

    if (error) {
      error.remove();
    }

    if (field === termsInput) {
      const termsError =
        document.querySelector(".terms-error");

      if (termsError) {
        termsError.remove();
      }
    }
  }

  function setError(field, message) {
    if (!field) {
      return;
    }

    removeError(field);

    field.classList.add("input-error");

    if (field === termsInput) {
      const error =
        document.createElement("span");

      error.className = "terms-error";

      error.textContent = message;

      const terms =
        document.querySelector(".terms");

      if (terms) {
        terms.insertAdjacentElement(
          "afterend",
          error
        );
      }

      return;
    }

    const error =
      document.createElement("span");

    error.className = "form-error";

    error.textContent = message;

    field.parentElement.appendChild(
      error
    );
  }

  function setSuccess(field) {
    if (!field) {
      return;
    }

    removeError(field);

    field.classList.add("input-success");
  }

  function validateName() {
    const value =
      nameInput.value.trim();

    if (!value) {
      setError(
        nameInput,
        "Full name is required."
      );

      return false;
    }

    if (value.length < 2) {
      setError(
        nameInput,
        "Name must be at least 2 characters."
      );

      return false;
    }

    if (value.length > 50) {
      setError(
        nameInput,
        "Name cannot exceed 50 characters."
      );

      return false;
    }

    const nameRegex =
      /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/;

    if (!nameRegex.test(value)) {
      setError(
        nameInput,
        "Name can contain only letters, spaces, apostrophes and hyphens."
      );

      return false;
    }

    setSuccess(nameInput);

    return true;
  }

  function validateEmail() {
    const value =
      emailInput.value.trim();

    if (!value) {
      setError(
        emailInput,
        "Email is required."
      );

      return false;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(value)) {
      setError(
        emailInput,
        "Please enter a valid email address."
      );

      return false;
    }

    if (value.length > 254) {
      setError(
        emailInput,
        "Email address is too long."
      );

      return false;
    }

    setSuccess(emailInput);

    return true;
  }

  function validatePassword() {
    const value =
      passwordInput.value;

    if (!value) {
      setError(
        passwordInput,
        "Password is required."
      );

      return false;
    }

    if (value.length > 128) {
      setError(
        passwordInput,
        "Password cannot exceed 128 characters."
      );

      return false;
    }

    const strongPassword =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!strongPassword.test(value)) {
      setError(
        passwordInput,
        "Password must contain uppercase, lowercase, number and minimum 8 characters."
      );

      return false;
    }

    setSuccess(passwordInput);

    return true;
  }

  function validateConfirmPassword() {
    const value =
      confirmPasswordInput.value;

    if (!value) {
      setError(
        confirmPasswordInput,
        "Please confirm your password."
      );

      return false;
    }

    if (
      passwordInput.value !== value
    ) {
      setError(
        confirmPasswordInput,
        "Passwords do not match."
      );

      return false;
    }

    setSuccess(confirmPasswordInput);

    return true;
  }

  function validateReferralCode() {
    const value =
      referralCodeInput.value.trim();

    if (!value) {
      removeError(referralCodeInput);

      return true;
    }

    if (value.length > 20) {
      setError(
        referralCodeInput,
        "Referral code cannot exceed 20 characters."
      );

      return false;
    }

    const referralCodeRegex =
      /^[A-Za-z0-9]+$/;

    if (!referralCodeRegex.test(value)) {
      setError(
        referralCodeInput,
        "Referral code can contain only letters and numbers."
      );

      return false;
    }

    setSuccess(referralCodeInput);

    return true;
  }

  function validateTerms() {
    if (!termsInput.checked) {
      setError(
        termsInput,
        "Please accept the Terms & Conditions and Privacy Policy."
      );

      return false;
    }

    removeError(termsInput);

    return true;
  }

  function showFirstError(field, message) {
    setError(
      field,
      message
    );

    showMessage(
      message,
      "error"
    );

    field.focus();

    return false;
  }

  nameInput.addEventListener(
    "input",
    () => {
      removeError(nameInput);
    }
  );

  emailInput.addEventListener(
    "input",
    () => {
      removeError(emailInput);
    }
  );

  passwordInput.addEventListener(
    "input",
    () => {
      removeError(passwordInput);
      removeError(confirmPasswordInput);
    }
  );

  confirmPasswordInput.addEventListener(
    "input",
    () => {
      removeError(confirmPasswordInput);
    }
  );

  referralCodeInput.addEventListener(
    "input",
    () => {
      removeError(referralCodeInput);
    }
  );

  termsInput.addEventListener(
    "change",
    () => {
      removeError(termsInput);
    }
  );

  registerForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      removeError(nameInput);
      removeError(emailInput);
      removeError(passwordInput);
      removeError(confirmPasswordInput);
      removeError(referralCodeInput);
      removeError(termsInput);

      const name =
        nameInput.value.trim();

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      const confirmPassword =
        confirmPasswordInput.value;

      const referralCode =
        referralCodeInput.value.trim();

      const terms =
        termsInput.checked;

      if (!validateName()) {
        const value = name;

        if (!value) {
          return showFirstError(
            nameInput,
            "Full name is required."
          );
        }

        if (value.length < 2) {
          return showFirstError(
            nameInput,
            "Name must be at least 2 characters."
          );
        }

        if (value.length > 50) {
          return showFirstError(
            nameInput,
            "Name cannot exceed 50 characters."
          );
        }

        return showFirstError(
          nameInput,
          "Name can contain only letters, spaces, apostrophes and hyphens."
        );
      }

      if (!validateEmail()) {
        const value =
          emailInput.value.trim();

        if (!value) {
          return showFirstError(
            emailInput,
            "Email is required."
          );
        }

        if (value.length > 254) {
          return showFirstError(
            emailInput,
            "Email address is too long."
          );
        }

        return showFirstError(
          emailInput,
          "Please enter a valid email address."
        );
      }

      if (!validatePassword()) {
        const value =
          passwordInput.value;

        if (!value) {
          return showFirstError(
            passwordInput,
            "Password is required."
          );
        }

        if (value.length > 128) {
          return showFirstError(
            passwordInput,
            "Password cannot exceed 128 characters."
          );
        }

        return showFirstError(
          passwordInput,
          "Password must contain uppercase, lowercase, number and minimum 8 characters."
        );
      }

      if (!validateConfirmPassword()) {
        if (!confirmPassword) {
          return showFirstError(
            confirmPasswordInput,
            "Please confirm your password."
          );
        }

        return showFirstError(
          confirmPasswordInput,
          "Passwords do not match."
        );
      }

      if (!validateReferralCode()) {
        const value =
          referralCodeInput.value.trim();

        if (value.length > 20) {
          return showFirstError(
            referralCodeInput,
            "Referral code cannot exceed 20 characters."
          );
        }

        return showFirstError(
          referralCodeInput,
          "Referral code can contain only letters and numbers."
        );
      }

      if (!validateTerms()) {
        showMessage(
          "Please accept the Terms & Conditions and Privacy Policy.",
          "error"
        );

        termsInput.focus();

        return;
      }

      const registerButton =
        registerForm.querySelector(
          ".auth-submit-btn"
        );

      registerButton.disabled = true;

      registerButton.textContent =
        "Creating account...";

      try {
        const response =
          await fetch(
            "/api/auth/signup",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                name,
                email,
                password,
                referralCode
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          showMessage(
            data.message ||
              "Registration failed.",
            "error"
          );

          return;
        }

        sessionStorage.setItem(
          "signupEmail",
          email
        );

        const resendAvailableAt =
          Date.now() +
          60 * 1000;

        sessionStorage.setItem(
          "signupOtpResendAvailableAt",
          resendAvailableAt.toString()
        );

        showMessage(
          "Account created successfully.",
          "success"
        );

        setTimeout(() => {
          window.location.href =
            "/verify-otp";
        }, 1000);
      } catch (error) {
        console.error(
          "Registration error:",
          error
        );

        showMessage(
          "Something went wrong. Please try again.",
          "error"
        );
      } finally {
        registerButton.disabled = false;

        registerButton.innerHTML =
          `Create Account <span>→</span>`;
      }
    }
  );
}

const passwordToggleButtons =
  document.querySelectorAll(
    ".password-toggle"
  );

passwordToggleButtons.forEach(
  (button) => {
    button.addEventListener(
      "click",
      () => {
        const targetId =
          button.dataset.target;

        const passwordInput =
          document.getElementById(
            targetId
          );

        if (!passwordInput) {
          return;
        }

        if (
          passwordInput.type ===
          "password"
        ) {
          passwordInput.type =
            "text";

          button.textContent =
            "👁️‍🗨️";

          button.setAttribute(
            "aria-label",
            "Hide password"
          );
        } else {
          passwordInput.type =
            "password";

          button.textContent =
            "👁";

          button.setAttribute(
            "aria-label",
            "Show password"
          );
        }
      }
    );
  }
);