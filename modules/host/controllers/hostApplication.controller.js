import {
  createHostApplicationService,
  getMyHostApplicationService,
  updateHostApplicationService,
} from "../../../services/hostApplication.service.js";

export const createHostApplication = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      organizationName,
      organizationType,
      website,
      description,
      bankName,
      bankAccountName,
      bankAccountNumber,
      ifscCode,
      identityProofType,
      organizationProofType,
      addressProofType,
      bankProofType,
    } = req.body;

    let contactDetails = req.body.contactDetails;

    if (typeof contactDetails === "string") {
      try {
        contactDetails = JSON.parse(contactDetails);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid contact details format",
        });
      }
    }

    const { primaryContactName, email, phoneNumber, officeAddress } =
      contactDetails || {};

    if (
      !organizationName ||
      !organizationType ||
      !description ||
      !primaryContactName ||
      !email ||
      !phoneNumber ||
      !officeAddress ||
      !bankName ||
      !bankAccountName ||
      !bankAccountNumber ||
      !ifscCode
    ) {
      return res.status(400).json({
        success: false,
        message: "All required host details must be provided",
      });
    }

    const identityProof = req.files?.identityProof?.[0];

    const organizationProof = req.files?.organizationProof?.[0];

    const addressProof = req.files?.addressProof?.[0];

    const bankProof = req.files?.bankProof?.[0];

    if (!identityProof || !organizationProof || !addressProof || !bankProof) {
      return res.status(400).json({
        success: false,
        message: "All required documents must be uploaded",
      });
    }

    if (
      !identityProofType ||
      !organizationProofType ||
      !addressProofType ||
      !bankProofType
    ) {
      return res.status(400).json({
        success: false,
        message: "Document types are required",
      });
    }

    const documents = {
      identityProof: {
        documentType: identityProofType,
        fileUrl: identityProof.path,
      },

      organizationProof: {
        documentType: organizationProofType,
        fileUrl: organizationProof.path,
      },

      addressProof: {
        documentType: addressProofType,
        fileUrl: addressProof.path,
      },

      bankProof: {
        documentType: bankProofType,
        fileUrl: bankProof.path,
      },
    };

    const application = await createHostApplicationService(userId, {
      organizationName,
      organizationType,
      website,
      description,
      bankName,
      bankAccountName,
      bankAccountNumber,
      ifscCode,
      contactDetails,
      documents,
    });

    return res.status(201).json({
      success: true,
      message: "Host application submitted successfully",
      applicationId: application._id,
    });
  } catch (error) {
    console.error("Create host application error:", error);

    const response = {
      success: false,
      message: error.message || "Internal server error",
    };

    if (error.applicationStatus) {
      response.status = error.applicationStatus;
    }

    return res.status(error.statusCode || 500).json(response);
  }
};

export const getMyHostApplication = async (req, res) => {
  try {
    const userId = req.user.userId;

    const application = await getMyHostApplicationService(userId);

    if (!application) {
      return res.status(200).json({
        success: true,
        hasApplication: false,
        application: null,
      });
    }

    return res.status(200).json({
      success: true,
      hasApplication: true,
      application,
    });
  } catch (error) {
    console.error("Get my host application error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const updateHostApplication = async (req, res) => {
  try {
    const userId = req.user.userId;

    const {
      organizationName,
      organizationType,
      website,
      description,
      contactDetails,
      bankName,
      bankAccountName,
      bankAccountNumber,
      ifscCode,
      identityProofType,
      organizationProofType,
      addressProofType,
      bankProofType,
    } = req.body;

    let parsedContactDetails = contactDetails;

    if (typeof parsedContactDetails === "string") {
      try {
        parsedContactDetails = JSON.parse(parsedContactDetails);
      } catch {
        return res.status(400).json({
          success: false,
          message: "Invalid contact details format",
        });
      }
    }

    if (
      parsedContactDetails !== undefined &&
      (!parsedContactDetails.primaryContactName ||
        !parsedContactDetails.email ||
        !parsedContactDetails.phoneNumber ||
        !parsedContactDetails.officeAddress)
    ) {
      return res.status(400).json({
        success: false,
        message: "All contact details are required",
      });
    }

    const files = req.files || {};

    const documents = {};

    const documentMap = [
      {
        field: "identityProof",
        type: identityProofType,
      },
      {
        field: "organizationProof",
        type: organizationProofType,
      },
      {
        field: "addressProof",
        type: addressProofType,
      },
      {
        field: "bankProof",
        type: bankProofType,
      },
    ];

    for (const document of documentMap) {
      const file = files[document.field]?.[0];

      if (file) {
        documents[document.field] = {
          documentType: document.type,
          fileUrl: file.path,
          uploadedAt: new Date(),
          verificationStatus: "pending",
        };
      }
    }

    const application = await updateHostApplicationService(userId, {
      organizationName,
      organizationType,
      website,
      description,
      contactDetails: parsedContactDetails,
      bankName,
      bankAccountName,
      bankAccountNumber,
      ifscCode,
      documents: Object.keys(documents).length ? documents : undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Host application resubmitted successfully",
    });
  } catch (error) {
    console.error("Update host application error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
