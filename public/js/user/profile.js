const loadProfile = async () => {
  const token = getToken();

  if (!token) {
    window.location.replace("/login");
    return;
  }

  try {
    const response = await fetch("/api/users/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401) {
      clearAuth();
      window.location.replace("/login");
      return;
    }

    if (response.status === 403) {
      if (result.blocked) {
        handleBlockedAccount();
        return;
      }

      throw new Error(
        result.message || "You do not have permission to access this profile.",
      );
    }

    if (!response.ok || !result.success) {
      throw new Error(result.message || "Failed to fetch profile.");
    }

    const user = result.data;

    if (!user) {
      throw new Error("Profile data not found.");
    }

    const setText = (id, value) => {
      const element = document.getElementById(id);

      if (element) {
        element.textContent = value;
      }
    };

    setText("profileName", user.name || "User");
    setText("profileEmail", user.email || "");
    setText("profileRole", user.role?.toUpperCase() || "USER");
    setText("profileInitial", user.name?.charAt(0).toUpperCase() || "U");
    setText("detailName", user.name || "Not available");
    setText("detailEmail", user.email || "Not available");
    setText("detailLanguage", user.language || "English");
    setText("referralCode", user.referralCode || "Not available");

    const memberSince = document.getElementById("memberSince");

    if (memberSince && user.created_at) {
      const date = new Date(user.created_at);

      memberSince.textContent = date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
  } catch (error) {
    console.error("Profile loading error:", error);

    if (typeof Swal !== "undefined") {
      Swal.fire({
        icon: "error",
        title: "Unable to load profile",
        text: error.message,
      });
    }
  }
};

const setupReferralCopy = () => {
  const copyButton = document.getElementById("copyReferralBtn");
  const referralCode = document.getElementById("referralCode");
  const copyMessage = document.getElementById("copyMessage");

  if (!copyButton || !referralCode) return;

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
        copyMessage.textContent = "Unable to copy referral code.";
      }
    }
  });
};

document.addEventListener("DOMContentLoaded", () => {
  if (redirectToLoginIfNotLoggedIn()) return;

  const role = getUserRole();

  if (role !== "user" && role !== "host") {
    window.location.replace(
      role === "admin" ? "/admin/profile" : "/login",
    );
    return;
  }

  protectAuthenticatedPage();
  loadProfile();
  setupReferralCopy();
});