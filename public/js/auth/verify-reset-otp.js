const verifyResetOtpForm =
  document.getElementById(
    "verifyResetOtpForm"
  );

const resendOtpBtn =
  document.getElementById(
    "resendOtpBtn"
  );

const forgotPasswordEmail =
  sessionStorage.getItem(
    "forgotPasswordEmail"
  );

const verificationEmail =
  document.getElementById(
    "verificationEmail"
  );

const RESEND_COOLDOWN = 30;

const resendCooldownKey =
  "forgotPasswordResendCooldown";

let resendTimer = null;

function updateResendTimer() {
  if (!resendOtpBtn) {
    return;
  }

  const cooldownEnd =
    Number(
      sessionStorage.getItem(
        resendCooldownKey
      )
    );

  if (!cooldownEnd) {
    resendOtpBtn.disabled = false;
    resendOtpBtn.textContent =
      "Resend OTP";

    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }

    return;
  }

  const remaining =
    Math.ceil(
      (cooldownEnd - Date.now()) / 1000
    );

  if (remaining <= 0) {
    sessionStorage.removeItem(
      resendCooldownKey
    );

    resendOtpBtn.disabled = false;
    resendOtpBtn.textContent =
      "Resend OTP";

    if (resendTimer) {
      clearInterval(resendTimer);
      resendTimer = null;
    }

    return;
  }

  resendOtpBtn.disabled = true;

  resendOtpBtn.textContent =
    `Resend OTP in ${remaining}s`;
}

function startResendTimer() {
  if (resendTimer) {
    clearInterval(resendTimer);
  }

  updateResendTimer();

  resendTimer = setInterval(
    updateResendTimer,
    1000
  );
}

function startResendCooldown() {
  const cooldownEnd =
    Date.now() +
    RESEND_COOLDOWN * 1000;

  sessionStorage.setItem(
    resendCooldownKey,
    cooldownEnd.toString()
  );

  startResendTimer();
}

if (!forgotPasswordEmail) {
  window.location.replace(
    "/forgot-password"
  );
} else {

  if (verificationEmail) {
    verificationEmail.textContent =
      forgotPasswordEmail;
  }

  startResendTimer();

  verifyResetOtpForm.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const otp =
        document
          .getElementById("otp")
          .value
          .trim();

      if (!otp) {
        showMessage(
          "Please enter the OTP.",
          "warning"
        );

        return;
      }

      if (!/^\d{6}$/.test(otp)) {
        showMessage(
          "Please enter a valid 6-digit OTP.",
          "warning"
        );

        return;
      }

      const verifyButton =
        verifyResetOtpForm.querySelector(
          ".verify-btn"
        );

      verifyButton.disabled = true;

      verifyButton.textContent =
        "Verifying...";

      try {
        const response =
          await fetch(
            "/api/auth/forgot-password/verify-otp",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify({
                email:
                  forgotPasswordEmail,
                otp
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          showMessage(
            data.message ||
              "OTP verification failed.",
            "error"
          );

          return;
        }

        if (!data.resetToken) {
          showMessage(
            "Reset token was not received. Please try again.",
            "error"
          );

          return;
        }

        sessionStorage.removeItem(
          "forgotPasswordEmail"
        );

        sessionStorage.removeItem(
          resendCooldownKey
        );

        sessionStorage.setItem(
          "resetToken",
          data.resetToken
        );

        showMessage(
          data.message ||
            "OTP verified successfully.",
          "success"
        );

        setTimeout(() => {
          window.location.replace(
            "/reset-password"
          );
        }, 1000);

      } catch (error) {
        console.error(
          "Forgot password OTP verification error:",
          error
        );

        showMessage(
          "Something went wrong. Please try again.",
          "error"
        );

      } finally {
        verifyButton.disabled = false;

        verifyButton.textContent =
          "Verify OTP";
      }
    }
  );

  resendOtpBtn?.addEventListener(
    "click",
    async () => {

      const cooldownEnd =
        Number(
          sessionStorage.getItem(
            resendCooldownKey
          )
        );

      if (
        cooldownEnd &&
        cooldownEnd > Date.now()
      ) {
        updateResendTimer();
        return;
      }

      if (!forgotPasswordEmail) {
        showMessage(
          "Email information is missing. Please start again.",
          "error"
        );

        return;
      }

      resendOtpBtn.disabled = true;

      resendOtpBtn.textContent =
        "Sending...";

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
                email:
                  forgotPasswordEmail
              })
            }
          );

        const data =
          await response.json();

        if (!response.ok) {
          showMessage(
            data.message ||
              "Failed to send OTP.",
            "error"
          );

          updateResendTimer();

          return;
        }

        showMessage(
          data.message ||
            "A new OTP has been sent.",
          "success"
        );

        startResendCooldown();

      } catch (error) {
        console.error(
          "Resend OTP error:",
          error
        );

        showMessage(
          "Something went wrong. Please try again.",
          "error"
        );

        resendOtpBtn.disabled = false;

        resendOtpBtn.textContent =
          "Resend OTP";
      }
    }
  );
}