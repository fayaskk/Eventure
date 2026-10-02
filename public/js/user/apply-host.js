document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("hostApplicationForm");

  if (!form) {
    return;
  }

  const MAX_FILE_SIZE = 5 * 1024 * 1024;

  const ALLOWED_FILE_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
  ];

  async function checkExistingApplication() {
    try {
      const token =
        localStorage.getItem("token") || sessionStorage.getItem("token");

      if (!token) {
        window.location.replace("/login");

        return null;
      }

      const response = await fetch("/api/host-applications/my-application", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");

        sessionStorage.removeItem("token");

        window.location.replace("/login");

        return null;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to check your host application.",
        );
      }

      if (data.hasApplication === true) {
        const status = data.application.verificationStatus;

        if (status === "pending") {
          window.location.replace("/host-application");

          return true;
        }

        if (status === "approved") {
          window.location.replace("/host/dashboard");

          return true;
        }

        if (status === "rejected") {
          return data.application;
        }
      }

      return false;
    } catch (error) {
      console.error("Existing host application fetch error:", error);

      showMessage(
        error.message || "Unable to check your host application.",
        "error",
      );

      return null;
    }
  }

  const existingApplication = await checkExistingApplication();

  if (existingApplication === true || existingApplication === null) {
    return;
  }

  let currentStep = 1;

  const steps = document.querySelectorAll(".application-step");

  const stepIndicators = document.querySelectorAll(
    ".application-stepper .step",
  );

  function removeError(field) {
    if (!field) {
      return;
    }

    field.classList.remove("input-error");

    field.classList.remove("input-success");

    const error = field.parentElement?.querySelector(".form-error");

    if (error) {
      error.remove();
    }
  }

  function setError(field, message) {
    if (!field) {
      return;
    }

    removeError(field);

    field.classList.add("input-error");

    const error = document.createElement("span");

    error.className = "form-error";

    error.textContent = message;

    field.parentElement.appendChild(error);
  }

  function setSuccess(field) {
    if (!field) {
      return;
    }

    removeError(field);

    field.classList.add("input-success");
  }

  function showValidationError(field, message) {
    setError(field, message);

    showMessage(message, "warning");

    field?.focus();

    return false;
  }

  function showStep(stepNumber) {
    currentStep = stepNumber;

    steps.forEach((step) => {
      const stepValue = Number(step.dataset.stepContent);

      step.classList.toggle("hidden", stepValue !== stepNumber);
    });

    stepIndicators.forEach((step) => {
      const stepValue = Number(step.dataset.step);

      step.classList.remove("active", "completed");

      if (stepValue === stepNumber) {
        step.classList.add("active");
      } else if (stepValue < stepNumber) {
        step.classList.add("completed");
      }
    });

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

    if (stepNumber === 4) {
      updateReview();
    }
  }

  function getFieldLabel(field) {
    const label = document.querySelector(`label[for="${field.id}"]`);

    if (!label) {
      return "This field";
    }

    return label.textContent
      .replace(/\(.*?\)/g, "")
      .replace(/Optional/gi, "")
      .trim();
  }

  function getValue(name) {
    const field = form.querySelector(`[name="${name}"]`);

    return field ? field.value.trim() : "";
  }

  function validateTextField(field, minLength, maxLength, pattern, message) {
    const value = field.value.trim();

    if (!value) {
      return showValidationError(field, `${getFieldLabel(field)} is required.`);
    }

    if (value.length < minLength) {
      return showValidationError(
        field,
        `${getFieldLabel(field)} must be at least ${minLength} characters.`,
      );
    }

    if (value.length > maxLength) {
      return showValidationError(
        field,
        `${getFieldLabel(field)} cannot exceed ${maxLength} characters.`,
      );
    }

    if (pattern && !pattern.test(value)) {
      return showValidationError(field, message);
    }

    setSuccess(field);

    return true;
  }

  function validateStep(stepNumber) {
    if (stepNumber === 1) {
      return validateContactStep();
    }

    if (stepNumber === 2) {
      return validateOrganizationStep();
    }

    if (stepNumber === 3) {
      return validateBankAndDocumentsStep();
    }

    return true;
  }

  function validateContactStep() {
    const name = document.getElementById("primaryContactName");

    const email = document.getElementById("contactEmail");

    const phone = document.getElementById("phoneNumber");

    const address = document.getElementById("officeAddress");

    const nameRegex = /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/;

    if (
      !validateTextField(
        name,
        2,
        50,
        nameRegex,
        "Contact name can contain only letters, spaces, apostrophes and hyphens.",
      )
    ) {
      return false;
    }

    const emailValue = email.value.trim();

    if (!emailValue) {
      return showValidationError(email, "Email address is required.");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(emailValue)) {
      return showValidationError(email, "Please enter a valid email address.");
    }

    if (emailValue.length > 254) {
      return showValidationError(email, "Email address is too long.");
    }

    setSuccess(email);

    const phoneValue = phone.value.trim();

    if (!phoneValue) {
      return showValidationError(phone, "Phone number is required.");
    }

    const normalizedPhone = phoneValue.replace(/[\s-]/g, "");

    const phoneRegex = /^(?:\+91)?[6-9]\d{9}$/;

    if (!phoneRegex.test(normalizedPhone)) {
      return showValidationError(
        phone,
        "Please enter a valid 10-digit Indian phone number.",
      );
    }

    setSuccess(phone);

    const addressValue = address.value.trim();

    if (!addressValue) {
      return showValidationError(address, "Office address is required.");
    }

    if (addressValue.length < 10) {
      return showValidationError(
        address,
        "Office address must be at least 10 characters.",
      );
    }

    if (addressValue.length > 500) {
      return showValidationError(
        address,
        "Office address cannot exceed 500 characters.",
      );
    }

    setSuccess(address);

    return true;
  }

  function validateOrganizationStep() {
    const organizationName = document.getElementById("organizationName");

    const organizationType = document.getElementById("organizationType");

    const website = document.getElementById("website");

    const description = document.getElementById("description");

    const organizationNameRegex = /^[A-Za-z0-9][A-Za-z0-9 &'.,()\-]*$/;

    if (
      !validateTextField(
        organizationName,
        2,
        100,
        organizationNameRegex,
        "Organization name contains invalid characters.",
      )
    ) {
      return false;
    }

    if (!organizationType.value) {
      return showValidationError(
        organizationType,
        "Please select an organization type.",
      );
    }

    setSuccess(organizationType);

    if (website.value.trim()) {
      const websiteValue = website.value.trim();

      let websiteUrl;

      try {
        websiteUrl = new URL(websiteValue);
      } catch (error) {
        return showValidationError(
          website,
          "Please enter a valid website URL.",
        );
      }

      if (websiteUrl.protocol !== "http:" && websiteUrl.protocol !== "https:") {
        return showValidationError(
          website,
          "Website must start with http:// or https://.",
        );
      }

      if (websiteValue.length > 2048) {
        return showValidationError(website, "Website URL is too long.");
      }

      setSuccess(website);
    } else {
      removeError(website);
    }

    const descriptionValue = description.value.trim();

    if (!descriptionValue) {
      return showValidationError(
        description,
        "Organization description is required.",
      );
    }

    if (descriptionValue.length < 20) {
      return showValidationError(
        description,
        "Organization description must be at least 20 characters.",
      );
    }

    if (descriptionValue.length > 1000) {
      return showValidationError(
        description,
        "Organization description cannot exceed 1000 characters.",
      );
    }

    setSuccess(description);

    return true;
  }

  function validateBankAndDocumentsStep() {
    const bankName = document.getElementById("bankName");

    const bankAccountName = document.getElementById("bankAccountName");

    const bankAccountNumber = document.getElementById("bankAccountNumber");

    const ifscCode = document.getElementById("ifscCode");

    const bankNameRegex = /^[A-Za-z0-9][A-Za-z0-9 &'.,()\-]*$/;

    if (
      !validateTextField(
        bankName,
        2,
        100,
        bankNameRegex,
        "Please enter a valid bank name.",
      )
    ) {
      return false;
    }

    const accountHolderRegex = /^[A-Za-z]+(?:[ '\-][A-Za-z]+)*$/;

    if (
      !validateTextField(
        bankAccountName,
        2,
        100,
        accountHolderRegex,
        "Account holder name can contain only letters, spaces, apostrophes and hyphens.",
      )
    ) {
      return false;
    }

    const accountNumber = bankAccountNumber.value.trim();

    if (!accountNumber) {
      return showValidationError(
        bankAccountNumber,
        "Bank account number is required.",
      );
    }

    if (!/^\d+$/.test(accountNumber)) {
      return showValidationError(
        bankAccountNumber,
        "Bank account number can contain only digits.",
      );
    }

    if (accountNumber.length < 9 || accountNumber.length > 18) {
      return showValidationError(
        bankAccountNumber,
        "Bank account number must contain between 9 and 18 digits.",
      );
    }

    setSuccess(bankAccountNumber);

    const ifsc = ifscCode.value.trim().toUpperCase();

    if (!ifsc) {
      return showValidationError(ifscCode, "IFSC code is required.");
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;

    if (!ifscRegex.test(ifsc)) {
      return showValidationError(ifscCode, "Please enter a valid IFSC code.");
    }

    ifscCode.value = ifsc;

    setSuccess(ifscCode);

    const documentFields = [
      {
        typeId: "identityProofType",
        fileId: "identityProof",
      },
      {
        typeId: "organizationProofType",
        fileId: "organizationProof",
      },
      {
        typeId: "addressProofType",
        fileId: "addressProof",
      },
      {
        typeId: "bankProofType",
        fileId: "bankProof",
      },
    ];

    for (const document of documentFields) {
      const typeField = document.getElementById(document.typeId);

      const fileField = document.getElementById(document.fileId);

      if (!typeField.value) {
        return showValidationError(
          typeField,
          `Please select ${getFieldLabel(typeField).toLowerCase()}.`,
        );
      }

      setSuccess(typeField);

      const hasNewFile = fileField.files && fileField.files.length > 0;

      const existingFile =
        existingApplication?.documents?.[document.fileId]?.fileUrl;

      if (!hasNewFile && !existingFile) {
        return showValidationError(
          fileField,
          `Please upload ${getFieldLabel(fileField).toLowerCase()}.`,
        );
      }

      if (hasNewFile) {
        const file = fileField.files[0];

        if (file.size > MAX_FILE_SIZE) {
          return showValidationError(
            fileField,
            `${getFieldLabel(fileField)} cannot exceed 5 MB.`,
          );
        }

        if (!ALLOWED_FILE_TYPES.includes(file.type)) {
          return showValidationError(
            fileField,
            `${getFieldLabel(fileField)} must be a PDF, JPG, PNG or WEBP file.`,
          );
        }

        setSuccess(fileField);
      }
    }

    return true;
  }

  document.querySelectorAll(".next-step-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const nextStep = Number(button.dataset.next);

      if (!validateStep(currentStep)) {
        return;
      }

      showStep(nextStep);
    });
  });

  document.querySelectorAll(".previous-step-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const previousStep = Number(button.dataset.previous);

      showStep(previousStep);
    });
  });

  document.querySelectorAll(".edit-step-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const editStep = Number(button.dataset.edit);

      showStep(editStep);
    });
  });

  document
    .querySelectorAll(
      "#hostApplicationForm input, #hostApplicationForm select, #hostApplicationForm textarea",
    )
    .forEach((field) => {
      field.addEventListener("input", () => {
        removeError(field);
      });

      field.addEventListener("change", () => {
        removeError(field);
      });
    });

  document.getElementById("ifscCode")?.addEventListener("input", (event) => {
    event.target.value = event.target.value.toUpperCase().replace(/\s/g, "");
  });

  document
    .getElementById("bankAccountNumber")
    ?.addEventListener("input", (event) => {
      event.target.value = event.target.value.replace(/\D/g, "");
    });

  document.querySelectorAll('input[type="file"]').forEach((input) => {
    input.addEventListener("change", () => {
      removeError(input);

      if (!input.files || !input.files.length) {
        return;
      }

      const file = input.files[0];

      if (file.size > MAX_FILE_SIZE) {
        input.value = "";

        showValidationError(
          input,
          `${getFieldLabel(input)} cannot exceed 5 MB.`,
        );

        return;
      }

      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        input.value = "";

        showValidationError(
          input,
          `${getFieldLabel(input)} must be a PDF, JPG, PNG or WEBP file.`,
        );

        return;
      }

      setSuccess(input);
    });
  });

  function updateReview() {
    setReviewText("reviewContactName", getValue("primaryContactName"));

    setReviewText("reviewContactEmail", getValue("contactEmail"));

    setReviewText("reviewPhoneNumber", getValue("phoneNumber"));

    setReviewText("reviewOfficeAddress", getValue("officeAddress"));

    setReviewText("reviewOrganizationName", getValue("organizationName"));

    setReviewText("reviewOrganizationType", getValue("organizationType"));

    setReviewText("reviewWebsite", getValue("website") || "Not provided");

    setReviewText("reviewDescription", getValue("description"));

    setReviewText("reviewBankName", getValue("bankName"));

    setReviewText("reviewBankAccountName", getValue("bankAccountName"));

    setReviewText(
      "reviewBankAccountNumber",
      maskAccountNumber(getValue("bankAccountNumber")),
    );

    setReviewText("reviewIfscCode", getValue("ifscCode"));

    setReviewText("reviewIdentityProof", getFileName("identityProof"));

    setReviewText("reviewOrganizationProof", getFileName("organizationProof"));

    setReviewText("reviewAddressProof", getFileName("addressProof"));

    setReviewText("reviewBankProof", getFileName("bankProof"));
  }

  function getValue(name) {
    const field = form.querySelector(`[name="${name}"]`);

    return field ? field.value.trim() : "";
  }

  function populateApplication(application) {
    const contact = application.contactDetails || {};

    form.querySelector('[name="primaryContactName"]').value =
      contact.primaryContactName || "";

    form.querySelector('[name="contactEmail"]').value = contact.email || "";

    form.querySelector('[name="phoneNumber"]').value =
      contact.phoneNumber || "";

    form.querySelector('[name="officeAddress"]').value =
      contact.officeAddress || "";

    form.querySelector('[name="organizationName"]').value =
      application.organizationName || "";

    form.querySelector('[name="organizationType"]').value =
      application.organizationType || "";

    form.querySelector('[name="website"]').value = application.website || "";

    form.querySelector('[name="description"]').value =
      application.description || "";

    form.querySelector('[name="bankName"]').value = application.bankName || "";

    form.querySelector('[name="bankAccountName"]').value =
      application.bankAccountName || "";

    form.querySelector('[name="bankAccountNumber"]').value =
      application.bankAccountNumber || "";

    form.querySelector('[name="ifscCode"]').value = application.ifscCode || "";

    form.querySelector('[name="identityProofType"]').value =
      application.documents?.identityProof?.documentType || "";

    form.querySelector('[name="organizationProofType"]').value =
      application.documents?.organizationProof?.documentType || "";

    form.querySelector('[name="addressProofType"]').value =
      application.documents?.addressProof?.documentType || "";

    form.querySelector('[name="bankProofType"]').value =
      application.documents?.bankProof?.documentType || "";

    populateExistingDocument(
      "identityProof",
      application.documents?.identityProof,
    );

    populateExistingDocument(
      "organizationProof",
      application.documents?.organizationProof,
    );

    populateExistingDocument(
      "addressProof",
      application.documents?.addressProof,
    );

    populateExistingDocument("bankProof", application.documents?.bankProof);
  }

  function populateExistingDocument(name, documentData) {
    if (!documentData?.fileUrl) {
      return;
    }

    const input = form.querySelector(`[name="${name}"]`);

    if (!input) {
      return;
    }

    let existingFile = input.parentElement.querySelector(".existing-file");

    if (!existingFile) {
      existingFile = document.createElement("div");

      existingFile.className = "existing-file";

      input.parentElement.appendChild(existingFile);
    }

    const fileName = documentData.fileUrl.split(/[\\/]/).pop();

    existingFile.textContent = `Existing document: ${fileName}`;
  }

  function setReviewText(id, value) {
    const element = document.getElementById(id);

    if (!element) {
      return;
    }

    element.textContent = value || "—";
  }

  function getFileName(name) {
    const input = form.querySelector(`[name="${name}"]`);

    if (input?.files && input.files.length > 0) {
      return input.files[0].name;
    }

    const existingFile = existingApplication?.documents?.[name]?.fileUrl;

    if (existingFile) {
      return existingFile.split(/[\\/]/).pop();
    }

    return "Not uploaded";
  }

  function maskAccountNumber(number) {
    if (!number) {
      return "—";
    }

    if (number.length <= 4) {
      return number;
    }

    const lastFour = number.slice(-4);

    return "•••• •••• " + lastFour;
  }

  form.addEventListener("submit", handleHostApplicationSubmit);

  async function handleHostApplicationSubmit(event) {
    event.preventDefault();

    if (currentStep !== 4) {
      return;
    }

    if (!validateStep(1)) {
      showStep(1);
      return;
    }

    if (!validateStep(2)) {
      showStep(2);
      return;
    }

    if (!validateStep(3)) {
      showStep(3);
      return;
    }

    const terms = document.getElementById("termsAccepted");

    const termsBox = document.querySelector(".terms-box");

    if (!terms || !terms.checked) {
      if (termsBox) {
        termsBox.classList.add("input-error");
      }

      let termsError = termsBox?.querySelector(".terms-error");

      if (!termsError) {
        termsError = document.createElement("span");

        termsError.className = "terms-error";

        termsError.textContent =
          "Please accept the terms and conditions before submitting.";

        termsBox?.appendChild(termsError);
      }

      showMessage(
        "Please accept the terms and conditions before submitting.",
        "warning",
      );

      terms.focus();

      return;
    }

    if (termsBox) {
      termsBox.classList.remove("input-error");

      termsBox.querySelector(".terms-error")?.remove();
    }

    const token =
      localStorage.getItem("token") || sessionStorage.getItem("token");

    if (!token) {
      window.location.replace("/login");

      return;
    }

    const submitButton = document.getElementById("submitApplicationBtn");

    const formData = new FormData(form);

    const contactDetails = {
      primaryContactName: getValue("primaryContactName"),

      email: getValue("contactEmail"),

      phoneNumber: getValue("phoneNumber"),

      officeAddress: getValue("officeAddress"),
    };

    formData.delete("primaryContactName");

    formData.delete("contactEmail");

    formData.delete("phoneNumber");

    formData.delete("officeAddress");

    formData.append("contactDetails", JSON.stringify(contactDetails));

    try {
      if (submitButton) {
        submitButton.disabled = true;

        submitButton.textContent = "Submitting...";
      }

      const method = existingApplication ? "PUT" : "POST";

      const response = await fetch("/api/host-applications", {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem("token");

        sessionStorage.removeItem("token");

        window.location.replace("/login");

        return;
      }

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to submit host application.");
      }

      showMessage(
        existingApplication
          ? "Host application resubmitted successfully!"
          : "Host application submitted successfully!",
        "success",
      );

      setTimeout(() => {
        window.location.href = "/host-application";
      }, 1200);
    } catch (error) {
      console.error("Host application submission error:", error);

      const message = document.getElementById("applicationMessage");

      if (message) {
        message.textContent =
          error.message || "Unable to submit host application.";
      }

      showMessage(
        error.message || "Unable to submit host application.",
        "error",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;

        submitButton.textContent = "Submit Application";
      }
    }
  }

  if (existingApplication) {
    populateApplication(existingApplication);
  }

  showStep(1);
});
