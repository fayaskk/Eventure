const resetPasswordForm =
  document.getElementById(
    "resetPasswordForm"
  );

const resetToken =
  sessionStorage.getItem(
    "resetToken"
  );

if (!resetToken) {

  showMessage(
    "Your password reset session has expired. Please request a new reset code.",
    "warning"
  );

  setTimeout(() => {
    window.location.replace(
      "/forgot-password"
    );
  }, 1000);

} else {

  resetPasswordForm.addEventListener(
    "submit",
    async (event) => {

      event.preventDefault();

      const newPassword =
        document.getElementById(
          "newPassword"
        ).value;

      const confirmPassword =
        document.getElementById(
          "confirmPassword"
        ).value;

      const strongPassword =
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

      if (!newPassword) {

        showMessage(
          "Please enter a new password.",
          "warning"
        );

        return;
      }

      if (!strongPassword.test(newPassword)) {

        showMessage(
          "Password must contain uppercase, lowercase, number and minimum 8 characters.",
          "warning"
        );

        return;
      }

      if (!confirmPassword) {

        showMessage(
          "Please confirm your password.",
          "warning"
        );

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

        return;
      }

      const resetButton =
        resetPasswordForm.querySelector(
          ".reset-btn"
        );

      resetButton.disabled = true;

      resetButton.textContent =
        "Resetting...";

      try {

        const response =
          await fetch(
            "/api/auth/reset-password",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                resetToken,
                newPassword,
                confirmPassword
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {

          if (
            response.status === 401 ||
            response.status === 403
          ) {

            sessionStorage.removeItem(
              "resetToken"
            );

            showMessage(
              data.message ||
                "Your password reset session has expired. Please request a new reset code.",
              "warning"
            );

            setTimeout(() => {
              window.location.replace(
                "/forgot-password"
              );
            }, 1200);

            return;
          }

          showMessage(
            data.message ||
              "Failed to reset password.",
            "error"
          );

          return;
        }

        sessionStorage.removeItem(
          "resetToken"
        );

        await showMessage(
          data.message ||
            "Password reset successfully.",
          "success"
        );

        setTimeout(() => {
          window.location.replace(
            "/login"
          );
        }, 1000);

      } catch (error) {

        console.error(
          "Reset password error:",
          error
        );

        showMessage(
          "Something went wrong. Please try again.",
          "error"
        );

      } finally {

        resetButton.disabled = false;

        resetButton.textContent =
          "Reset Password";

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
            "👁️";

          button.setAttribute(
            "aria-label",
            "Show password"
          );

        }
      }
    );
  }
);