import mongoose from "mongoose";
import { Host } from "../models/hostApplication.model.js";
import { User } from "../models/user.model.js";
import path from "path";
import process from "process";

export const createHostApplicationService = async (userId, applicationData) => {
  const {
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
  } = applicationData;

  const user = await User.findById(userId);

  if (!user) {
    const error = new Error("User not found");
    error.statusCode = 404;
    throw error;
  }

  if (user.role !== "user") {
    const error = new Error("Only normal users can apply as host");
    error.statusCode = 403;
    throw error;
  }

  const existingApplication = await Host.findOne({
    user: userId,
  });

  if (existingApplication) {
    const error = new Error("Host application already exists");
    error.statusCode = 409;
    error.applicationStatus = existingApplication.verificationStatus;
    throw error;
  }

  const application = await Host.create({
    user: userId,

    organizationName: organizationName.trim(),
    organizationType: organizationType.trim(),

    website: website ? website.trim() : undefined,

    description: description.trim(),

    contactDetails: {
      primaryContactName: contactDetails.primaryContactName.trim(),

      email: contactDetails.email.trim().toLowerCase(),

      phoneNumber: contactDetails.phoneNumber.trim(),

      officeAddress: contactDetails.officeAddress.trim(),
    },

    bankName: bankName.trim(),
    bankAccountName: bankAccountName.trim(),
    bankAccountNumber: bankAccountNumber.trim(),
    ifscCode: ifscCode.trim().toUpperCase(),

    documents,
  });

  return application;
};

export const getMyHostApplicationService = async (userId) => {
  if (!mongoose.isValidObjectId(userId)) {
    const error = new Error("Invalid user ID");
    error.statusCode = 400;
    throw error;
  }

  const application = await Host.findOne({
    user: userId,
  }).select("-__v");

  return application;
};

export const updateHostApplicationService = async (userId, applicationData) => {
  const application = await Host.findOne({
    user: userId,
  });

  if (!application) {
    const error = new Error("Host application not found");
    error.statusCode = 404;
    throw error;
  }

  if (application.verificationStatus !== "rejected") {
    const error = new Error("Only rejected applications can be resubmitted");
    error.statusCode = 400;
    throw error;
  }

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
    documents,
  } = applicationData;

  if (organizationName !== undefined) {
    application.organizationName = organizationName.trim();
  }

  if (organizationType !== undefined) {
    application.organizationType = organizationType.trim();
  }

  if (website !== undefined) {
    application.website = website.trim();
  }

  if (description !== undefined) {
    application.description = description.trim();
  }

  if (contactDetails !== undefined) {
    application.contactDetails = {
      primaryContactName: contactDetails.primaryContactName.trim(),

      email: contactDetails.email.trim().toLowerCase(),

      phoneNumber: contactDetails.phoneNumber.trim(),

      officeAddress: contactDetails.officeAddress.trim(),
    };
  }

  if (bankName !== undefined) {
    application.bankName = bankName.trim();
  }

  if (bankAccountName !== undefined) {
    application.bankAccountName = bankAccountName.trim();
  }

  if (bankAccountNumber !== undefined) {
    application.bankAccountNumber = bankAccountNumber.trim();
  }

  if (ifscCode !== undefined) {
    application.ifscCode = ifscCode.trim().toUpperCase();
  }

  if (documents) {
    for (const [field, document] of Object.entries(documents)) {
      if (document) {
        application.documents[field] = document;
      }
    }
  }

  application.verificationStatus = "pending";
  application.rejectionReason = undefined;

  return await application.save();
};

export const getHostApplicationsService = async ({
  search = "",
  status,
  page = 1,
  limit = 5,
}) => {
  const filter = {};

  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    const searchRegex = {
      $regex: normalizedSearch,
      $options: "i",
    };

    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
      ],
    }).select("_id");

    const matchingUserIds = users.map(
      (user) => user._id
    );

    filter.$or = [
      {
        organizationName: searchRegex,
      },
      {
        organizationType: searchRegex,
      },
      {
        user: {
          $in: matchingUserIds,
        },
      },
    ];
  }

  if (status !== undefined) {
    const normalizedStatus = status.trim().toLowerCase();

    const allowedStatuses = [
      "pending",
      "approved",
      "rejected",
    ];

    if (!allowedStatuses.includes(normalizedStatus)) {
      const error = new Error(
        "Status must be pending, approved or rejected"
      );
      error.statusCode = 400;
      throw error;
    }

    filter.verificationStatus = normalizedStatus;
  }

  const pageNumber = Number(page) || 1;
  const limitNumber = Number(limit) || 5;

  if (
    !Number.isInteger(pageNumber) ||
    pageNumber < 1
  ) {
    const error = new Error(
      "Page must be a positive integer"
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    !Number.isInteger(limitNumber) ||
    limitNumber < 1 ||
    limitNumber > 100
  ) {
    const error = new Error(
      "Limit must be between 1 and 100"
    );
    error.statusCode = 400;
    throw error;
  }

  const skip = (pageNumber - 1) * limitNumber;

  const hostApplications = await Host.find(filter)
    .populate("user", "name email")
    .select("-__v")
    .sort({ created_at: -1 })
    .skip(skip)
    .limit(limitNumber);

  const totalHostApplications =
    await Host.countDocuments(filter);

  const totalPages = Math.ceil(
    totalHostApplications / limitNumber
  );

  return {
    applications: hostApplications,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      totalHostApplications,
      totalPages,
    },
  };
};

export const getHostApplicationByIdService = async (
  applicationId
) => {
  if (!mongoose.isValidObjectId(applicationId)) {
    const error = new Error("Invalid application ID");
    error.statusCode = 400;
    throw error;
  }

  const hostApplication = await Host.findById(
    applicationId
  ).populate("user", "name email");

  if (!hostApplication) {
    const error = new Error(
      "Host application not found"
    );
    error.statusCode = 404;
    throw error;
  }

  return hostApplication;
};

export const getHostApplicationDocumentService = async (
  applicationId,
  documentType
) => {
  if (!mongoose.isValidObjectId(applicationId)) {
    const error = new Error("Invalid application ID");
    error.statusCode = 400;
    throw error;
  }

  const allowedDocuments = [
    "identityProof",
    "organizationProof",
    "addressProof",
    "bankProof",
  ];

  if (!allowedDocuments.includes(documentType)) {
    const error = new Error("Invalid document type");
    error.statusCode = 400;
    throw error;
  }

  const hostApplication = await Host.findById(
    applicationId
  ).select("documents");

  if (!hostApplication) {
    const error = new Error(
      "Host application not found"
    );
    error.statusCode = 404;
    throw error;
  }

  const document =
    hostApplication.documents?.[documentType];

  if (!document?.fileUrl) {
    const error = new Error("Document not found");
    error.statusCode = 404;
    throw error;
  }

 
  const fileName = path.basename(document.fileUrl);

  const filePath = path.join(
    process.cwd(),
    "public",
    "uploads",
    "host-documents",
    fileName
  );

  return filePath;
};

export const approveHostApplicationService = async (
  applicationId
) => {
  if (!mongoose.isValidObjectId(applicationId)) {
    const error = new Error("Invalid application ID");
    error.statusCode = 400;
    throw error;
  }

  const application = await Host.findById(
    applicationId
  );

  if (!application) {
    const error = new Error(
      "Host Application Not Found"
    );
    error.statusCode = 404;
    throw error;
  }

  if (application.verificationStatus !== "pending") {
    const error = new Error(
      `Application already ${application.verificationStatus}`
    );
    error.statusCode = 400;
    throw error;
  }

  const user = await User.findById(application.user);

  if (!user) {
    const error = new Error(
      "Associated user not found"
    );
    error.statusCode = 404;
    throw error;
  }

  if (user.role === "host") {
    const error = new Error(
      "User is already a host"
    );
    error.statusCode = 400;
    throw error;
  }

  user.role = "host";

  application.verificationStatus = "approved";
  application.rejectionReason = undefined;

  await user.save();
  await application.save();
};

export const rejectHostApplicationService = async (
  applicationId,
  rejectionReason
) => {
  if (!mongoose.isValidObjectId(applicationId)) {
    const error = new Error("Invalid application ID");
    error.statusCode = 400;
    throw error;
  }

  if (
    !rejectionReason ||
    !rejectionReason.trim()
  ) {
    const error = new Error(
      "Rejection reason is required"
    );
    error.statusCode = 400;
    throw error;
  }

  const application = await Host.findById(
    applicationId
  );

  if (!application) {
    const error = new Error(
      "Host Application Not Found"
    );
    error.statusCode = 404;
    throw error;
  }

  if (application.verificationStatus !== "pending") {
    const error = new Error(
      `Application already ${application.verificationStatus}`
    );
    error.statusCode = 400;
    throw error;
  }

  application.verificationStatus = "rejected";

  application.rejectionReason =
    rejectionReason.trim();

  await application.save();

  return application.rejectionReason;
};