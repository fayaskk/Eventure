const googleAuthButton =
  document.getElementById("googleAuthBtn");

if (googleAuthButton) {
  googleAuthButton.addEventListener("click", () => {
    const rememberMeInput =
      document.getElementById("rememberMe");

    const rememberMe =
      rememberMeInput?.checked || false;

    sessionStorage.setItem(
      "googleRememberMe",
      rememberMe ? "true" : "false"
    );

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
      sessionStorage.removeItem(
        "googleRememberMe"
      );

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
    sessionStorage.removeItem(
      "googleRememberMe"
    );

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
    sessionStorage.removeItem(
      "googleRememberMe"
    );

    showMessage(
      "Google authentication failed. Please try again.",
      "error"
    );

    return;
  }

  const rememberMe =
    sessionStorage.getItem(
      "googleRememberMe"
    ) === "true";

  if (rememberMe) {
    localStorage.setItem(
      "token",
      token
    );

    sessionStorage.removeItem(
      "token"
    );
  } else {
    sessionStorage.setItem(
      "token",
      token
    );

    localStorage.removeItem(
      "token"
    );
  }

  sessionStorage.removeItem(
    "googleRememberMe"
  );

  try {
    const tokenParts =
      token.split(".");

    if (tokenParts.length !== 3) {
      throw new Error(
        "Invalid JWT format"
      );
    }

    let payloadString = tokenParts[1];

    payloadString =
      payloadString
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    while (payloadString.length % 4) {
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

    localStorage.removeItem(
      "token"
    );

    sessionStorage.removeItem(
      "token"
    );

    sessionStorage.removeItem(
      "googleRememberMe"
    );

    showMessage(
      "Google authentication failed. Please try again.",
      "error"
    );
  }
});

if (redirectToDashboardIfLoggedIn()) {
  throw new Error("Already logged in");
}

const loginForm =
  document.getElementById("loginForm");

if (loginForm) {
  const emailInput =
    document.getElementById("email");

  const passwordInput =
    document.getElementById("password");

  const rememberMeInput =
    document.getElementById("rememberMe");

  function removeError(field) {
    if (!field) {
      return;
    }

    field.classList.remove(
      "input-error"
    );

    const error =
      field.parentElement?.querySelector(
        ".form-error"
      );

    if (error) {
      error.remove();
    }
  }

  function setError(
    field,
    message
  ) {
    if (!field) {
      return;
    }

    removeError(field);

    field.classList.add(
      "input-error"
    );

    const error =
      document.createElement(
        "span"
      );

    error.className =
      "form-error";

    error.textContent =
      message;

    field.parentElement.appendChild(
      error
    );
  }

  function setSuccess(field) {
    if (!field) {
      return;
    }

    removeError(field);

    field.classList.add(
      "input-success"
    );
  }

  if (emailInput) {
    emailInput.addEventListener(
      "input",
      () => {
        removeError(emailInput);
      }
    );
  }

  if (passwordInput) {
    passwordInput.addEventListener(
      "input",
      () => {
        removeError(passwordInput);
      }
    );
  }

  loginForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      removeError(emailInput);
      removeError(passwordInput);

      const email =
        emailInput.value.trim();

      const password =
        passwordInput.value;

      if (!email) {
        const message =
          "Email is required.";

        setError(
          emailInput,
          message
        );

        showMessage(
          message,
          "error"
        );

        emailInput.focus();

        return;
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        const message =
          "Please enter a valid email address.";

        setError(
          emailInput,
          message
        );

        showMessage(
          message,
          "error"
        );

        emailInput.focus();

        return;
      }

      if (email.length > 254) {
        const message =
          "Email address is too long.";

        setError(
          emailInput,
          message
        );

        showMessage(
          message,
          "error"
        );

        emailInput.focus();

        return;
      }

      setSuccess(emailInput);

      if (!password) {
        const message =
          "Password is required.";

        setError(
          passwordInput,
          message
        );

        showMessage(
          message,
          "error"
        );

        passwordInput.focus();

        return;
      }

      if (password.length < 8) {
        const message =
          "Password must be at least 8 characters.";

        setError(
          passwordInput,
          message
        );

        showMessage(
          message,
          "error"
        );

        passwordInput.focus();

        return;
      }

      if (password.length > 128) {
        const message =
          "Password cannot exceed 128 characters.";

        setError(
          passwordInput,
          message
        );

        showMessage(
          message,
          "error"
        );

        passwordInput.focus();

        return;
      }

      setSuccess(passwordInput);

      const rememberMe =
        rememberMeInput?.checked ||
        false;

      const loginButton =
        loginForm.querySelector(
          ".login-button"
        );

      loginButton.disabled = true;

      loginButton.textContent =
        "Signing in...";

      try {
        const response =
          await fetch(
            "/api/auth/login",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json"
              },
              body: JSON.stringify({
                email,
                password
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          showMessage(
            data.message ||
              "Login failed.",
            "error"
          );

          return;
        }

        if (!data.token) {
          showMessage(
            "Login failed. Authentication token was not received.",
            "error"
          );

          return;
        }

        if (
          !data.user ||
          !data.user.role
        ) {
          showMessage(
            "Login failed. User information was not received.",
            "error"
          );

          return;
        }

        if (rememberMe) {
          localStorage.setItem(
            "token",
            data.token
          );

          sessionStorage.removeItem(
            "token"
          );
        } else {
          sessionStorage.setItem(
            "token",
            data.token
          );

          localStorage.removeItem(
            "token"
          );
        }

        if (
          data.user.role ===
          "admin"
        ) {
          window.location.replace(
            "/admin/dashboard"
          );
        } else if (
          data.user.role ===
          "host"
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
          "Login error:",
          error
        );

        showMessage(
          "Something went wrong. Please try again.",
          "error"
        );
      } finally {
        loginButton.disabled =
          false;

        loginButton.innerHTML =
          "Sign In →";
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