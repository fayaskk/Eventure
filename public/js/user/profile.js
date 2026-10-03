const loadProfile = async () => {
  const token = getToken();

  if (!token) {
    window.location.replace("/login");
    return;
  }

  try {
    const response = await fetch(
      "/api/users/profile",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    let result = {};

    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (response.status === 401 || response.status === 403) {
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");

      window.location.replace("/login");
      return;
    }

    if (!response.ok) {
      throw new Error(
        result.message || "Failed to fetch profile"
      );
    }

    const user = result.data;

    if (!user) {
      throw new Error("Profile data not found");
    }

    const profileName = document.getElementById("profileName");
    const profileEmail = document.getElementById("profileEmail");
    const profileRole = document.getElementById("profileRole");
    const profileInitial = document.getElementById("profileInitial");

    const detailName = document.getElementById("detailName");
    const detailEmail = document.getElementById("detailEmail");
    const detailLanguage =
      document.getElementById("detailLanguage");

    const memberSince =
      document.getElementById("memberSince");

    const referralCode =
      document.getElementById("referralCode");

    if (profileName) {
      profileName.textContent = user.name || "User";
    }

    if (profileEmail) {
      profileEmail.textContent = user.email || "";
    }

    if (profileRole) {
      profileRole.textContent =
        user.role?.toUpperCase() || "USER";
    }

    if (profileInitial) {
      profileInitial.textContent =
        user.name?.charAt(0).toUpperCase() || "U";
    }

    if (detailName) {
      detailName.textContent = user.name || "Not available";
    }

    if (detailEmail) {
      detailEmail.textContent = user.email || "Not available";
    }

    if (detailLanguage) {
      detailLanguage.textContent =
        user.language || "English";
    }

    if (referralCode) {
      referralCode.textContent =
        user.referralCode || "Not available";
    }

    if (memberSince && user.created_at) {
      const date = new Date(user.created_at);

      memberSince.textContent =
        date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        });
    }
  } catch (error) {
    console.error("Profile loading error:", error);

    if (!getToken()) {
      window.location.replace("/login");
      return;
    }

    alert(error.message);
  }
};

const setupReferralCopy = () => {
  const copyButton =
    document.getElementById("copyReferralBtn");

  const referralCode =
    document.getElementById("referralCode");

  const copyMessage =
    document.getElementById("copyMessage");

  if (!copyButton || !referralCode) {
    return;
  }

  copyButton.addEventListener("click", async () => {
    const code = referralCode.textContent.trim();

    if (!code || code === "Loading..." || code === "Not available") {
      return;
    }

    try {
      await navigator.clipboard.writeText(code);

      if (copyMessage) {
        copyMessage.textContent = "Referral code copied!";
      }

      copyButton.textContent = "Copied";

      setTimeout(() => {
        copyButton.textContent = "Copy";

        if (copyMessage) {
          copyMessage.textContent = "";
        }
      }, 2000);
    } catch (error) {
      console.error("Copy failed:", error);

      if (copyMessage) {
        copyMessage.textContent =
          "Unable to copy referral code.";
      }
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  if (redirectToLoginIfNotLoggedIn()) {
    return;
  }

  protectAuthenticatedPage();

  loadProfile();
  setupReferralCopy();
});