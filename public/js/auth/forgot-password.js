const forgotPasswordForm =
  document.getElementById("forgotPasswordForm");

const message =
  document.getElementById("message");

const submitButton =
  forgotPasswordForm.querySelector(
    "button[type='submit']"
  );

const RESEND_COOLDOWN = 30;

const resendCooldownKey =
  "forgotPasswordResendCooldown";

forgotPasswordForm.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    const email =
      document
        .getElementById("email")
        .value
        .trim();

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {

      showMessage(
        "Email is required.",
        "warning"
      );

      return;
    }

    if (!emailRegex.test(email)) {

      showMessage(
        "Please enter a valid email address.",
        "warning"
      );

      return;
    }

    submitButton.disabled = true;

    submitButton.textContent =
      "Sending Verification Code...";

    try {

      const response =
        await fetch(
          "/api/auth/forgot-password",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              email
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        showMessage(
          data.message ||
            "Failed to send verification code.",
          "error"
        );

        return;
      }

      sessionStorage.setItem(
        "forgotPasswordEmail",
        email
      );

      const cooldownEnd =
        Date.now() +
        RESEND_COOLDOWN * 1000;

      sessionStorage.setItem(
        resendCooldownKey,
        cooldownEnd.toString()
      );

      await showMessage(
        data.message ||
          "Verification code sent successfully.",
        "success"
      );

      window.location.replace(
        "/verify-reset-otp"
      );

    } catch (error) {

      console.error(
        "Forgot password error:",
        error
      );

      showMessage(
        "Something went wrong. Please try again.",
        "error"
      );

    } finally {

      submitButton.disabled = false;

      submitButton.textContent =
        "Send Verification Code";
    }
  }
);