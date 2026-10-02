const signupEmail =
  sessionStorage.getItem("signupEmail");

const verifyOtpForm =
  document.getElementById(
    "verifyOtpForm"
  );

const otpMessage =
  document.getElementById(
    "otpMessage"
  );

const resendOtpBtn =
  document.getElementById(
    "resendOtpBtn"
  );

const verificationEmail =
  document.getElementById(
    "verificationEmail"
  );

const otpInput =
  document.getElementById("otp");

const RESEND_COOLDOWN = 60;

const RESEND_AVAILABLE_AT_KEY =
  "signupOtpResendAvailableAt";

let resendInterval = null;

if (!signupEmail) {
  window.location.replace(
    "/register"
  );
} else {
  verificationEmail.textContent =
    signupEmail;
}

otpInput.addEventListener(
  "input",
  () => {
    otpInput.value =
      otpInput.value
        .replace(/\D/g, "")
        .slice(0, 6);
  }
);

function startResendTimer() {
  const availableAt =
    Date.now() +
    RESEND_COOLDOWN * 1000;

  sessionStorage.setItem(
    RESEND_AVAILABLE_AT_KEY,
    availableAt.toString()
  );

  runResendTimer();
}

function runResendTimer() {
  if (resendInterval) {
    clearInterval(
      resendInterval
    );
  }

  const storedTime =
    sessionStorage.getItem(
      RESEND_AVAILABLE_AT_KEY
    );

  if (!storedTime) {
    enableResendButton();

    return;
  }

  const availableAt =
    Number(storedTime);

  if (
    !Number.isFinite(
      availableAt
    )
  ) {
    sessionStorage.removeItem(
      RESEND_AVAILABLE_AT_KEY
    );

    enableResendButton();

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
        resendInterval
      );

      resendInterval = null;

      sessionStorage.removeItem(
        RESEND_AVAILABLE_AT_KEY
      );

      enableResendButton();

      return;
    }

    resendOtpBtn.disabled = true;

    resendOtpBtn.innerHTML =
      `Resend OTP in <span>${remaining}</span>s`;
  };

  updateTimer();

  resendInterval =
    setInterval(
      updateTimer,
      1000
    );
}

function enableResendButton() {
  resendOtpBtn.disabled = false;

  resendOtpBtn.textContent =
    "Resend OTP";
}

function showOtpMessage(
  message,
  type
) {
  otpMessage.textContent =
    message;

  if (type === "success") {
    otpMessage.style.color =
      "#8ee6ae";
  } else {
    otpMessage.style.color =
      "#ff8a8a";
  }
}

if (signupEmail) {
  runResendTimer();
}

verifyOtpForm.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const otp =
      otpInput.value.trim();

    if (!/^\d{6}$/.test(otp)) {
      showOtpMessage(
        "Please enter a valid 6-digit OTP.",
        "error"
      );

      showMessage(
        "Please enter a valid 6-digit OTP.",
        "error"
      );

      otpInput.focus();

      return;
    }

    const verifyButton =
      verifyOtpForm.querySelector(
        ".verify-btn"
      );

    verifyButton.disabled = true;

    verifyButton.textContent =
      "Verifying...";

    try {
      const response =
        await fetch(
          "/api/auth/verify-otp",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              email: signupEmail,
              otp
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        showOtpMessage(
          data.message ||
            "OTP verification failed.",
          "error"
        );

        showMessage(
          data.message ||
            "OTP verification failed.",
          "error"
        );

        return;
      }

      showOtpMessage(
        data.message ||
          "Email verified successfully.",
        "success"
      );

      showMessage(
        data.message ||
          "Email verified successfully.",
        "success"
      );

      sessionStorage.removeItem(
        "signupEmail"
      );

      sessionStorage.removeItem(
        RESEND_AVAILABLE_AT_KEY
      );

      if (resendInterval) {
        clearInterval(
          resendInterval
        );

        resendInterval = null;
      }

      setTimeout(() => {
        window.location.replace(
          "/login"
        );
      }, 1500);
    } catch (error) {
      console.error(
        "OTP verification error:",
        error
      );

      showOtpMessage(
        "Something went wrong. Please try again.",
        "error"
      );

      showMessage(
        "Something went wrong. Please try again.",
        "error"
      );
    } finally {
      verifyButton.disabled =
        false;

      verifyButton.textContent =
        "Verify Email";
    }
  }
);

resendOtpBtn.addEventListener(
  "click",
  async () => {
    if (
      resendOtpBtn.disabled
    ) {
      return;
    }

    resendOtpBtn.disabled = true;

    resendOtpBtn.textContent =
      "Sending...";

    try {
      const response =
        await fetch(
          "/api/auth/resend-otp",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({
              email: signupEmail
            })
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        showOtpMessage(
          data.message ||
            "Unable to resend OTP.",
          "error"
        );

        showMessage(
          data.message ||
            "Unable to resend OTP.",
          "error"
        );

        enableResendButton();

        return;
      }

      showOtpMessage(
        data.message ||
          "A new OTP has been sent to your email.",
        "success"
      );

      showMessage(
        data.message ||
          "A new OTP has been sent to your email.",
        "success"
      );

      startResendTimer();
    } catch (error) {
      console.error(
        "Resend OTP error:",
        error
      );

      showOtpMessage(
        "Something went wrong. Please try again.",
        "error"
      );

      showMessage(
        "Something went wrong. Please try again.",
        "error"
      );

      enableResendButton();
    }
  }
);