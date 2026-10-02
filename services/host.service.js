import { User } from "../models/user.model.js";
import { Host } from "../models/hostApplication.model.js";
import mongoose from "mongoose";

export const getHostProfileService = async (hostId) => {
  const host = await User.findById(hostId);

  if (!host) {
    const error = new Error("Host not found");
    error.statusCode = 404;
    throw error;
  }

  if (host.role !== "host") {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  const hostApplication = await Host.findOne({
    user: hostId,
  });

  if (!hostApplication) {
    const error = new Error("Host details not found");
    error.statusCode = 404;
    throw error;
  }

  return {
    name: host.name,
    email: host.email,

    organization: {
      organizationName: hostApplication.organizationName,
      organizationType: hostApplication.organizationType,
      website: hostApplication.website,
      description: hostApplication.description,
      verificationStatus:
        hostApplication.verificationStatus,
    },

    contactDetails: {
      primaryContactName:
        hostApplication.contactDetails.primaryContactName,

      email:
        hostApplication.contactDetails.email,

      phoneNumber:
        hostApplication.contactDetails.phoneNumber,

      officeAddress:
        hostApplication.contactDetails.officeAddress,
    },

    bankDetails: {
      bankName: hostApplication.bankName,

      accountHolderName:
        hostApplication.bankAccountName,

      accountNumber:
        hostApplication.bankAccountNumber,

      ifscCode:
        hostApplication.ifscCode,
    },
  };
};

export const updateHostProfileService = async (
  hostId,
  profileData,
) => {
  const host = await User.findById(hostId);

  if (!host) {
    const error = new Error("Host not found");
    error.statusCode = 404;
    throw error;
  }

  if (host.role !== "host") {
    const error = new Error("Unauthorized");
    error.statusCode = 403;
    throw error;
  }

  const hostApplication = await Host.findOne({
    user: hostId,
  });

  if (!hostApplication) {
    const error = new Error("Host details not found");
    error.statusCode = 404;
    throw error;
  }

  const {
    organizationName,
    organizationType,
    website,
    description,
    contactDetails,
    bankAccountName,
    bankAccountNumber,
    ifscCode,
    bankName,
  } = profileData;

  if (organizationName !== undefined) {
    const normalizedOrganizationName =
      organizationName.trim();

    if (!normalizedOrganizationName) {
      const error = new Error(
        "Organization name cannot be empty",
      );
      error.statusCode = 400;
      throw error;
    }

    hostApplication.organizationName =
      normalizedOrganizationName;
  }

  if (organizationType !== undefined) {
    const normalizedOrganizationType =
      organizationType.trim();

    if (!normalizedOrganizationType) {
      const error = new Error(
        "Organization type cannot be empty",
      );
      error.statusCode = 400;
      throw error;
    }

    hostApplication.organizationType =
      normalizedOrganizationType;
  }

  if (website !== undefined) {
    hostApplication.website = website.trim();
  }

  if (description !== undefined) {
    const normalizedDescription =
      description.trim();

    if (!normalizedDescription) {
      const error = new Error(
        "Description cannot be empty",
      );
      error.statusCode = 400;
      throw error;
    }

    hostApplication.description =
      normalizedDescription;
  }

  if (contactDetails !== undefined) {
    if (!contactDetails) {
      const error = new Error(
        "Contact details cannot be empty",
      );
      error.statusCode = 400;
      throw error;
    }

    if (
      !contactDetails.primaryContactName ||
      !contactDetails.email ||
      !contactDetails.phoneNumber ||
      !contactDetails.officeAddress
    ) {
      const error = new Error(
        "All contact details are required",
      );
      error.statusCode = 400;
      throw error;
    }

    hostApplication.contactDetails = {
      primaryContactName:
        contactDetails.primaryContactName.trim(),

      email:
        contactDetails.email.trim().toLowerCase(),

      phoneNumber:
        contactDetails.phoneNumber.trim(),

      officeAddress:
        contactDetails.officeAddress.trim(),
    };
  }

  if (bankAccountName !== undefined) {
    hostApplication.bankAccountName =
      bankAccountName.trim();
  }

  if (bankAccountNumber !== undefined) {
    hostApplication.bankAccountNumber =
      bankAccountNumber.trim();
  }

  if (ifscCode !== undefined) {
    hostApplication.ifscCode =
      ifscCode.trim().toUpperCase();
  }

  if (bankName !== undefined) {
    hostApplication.bankName =
      bankName.trim();
  }

  await hostApplication.save();

  return hostApplication;
};

export const getAllHostsService = async ({
  search = "",
  blocked,
  verified,
}) => {
  const hostFilter = {
    verificationStatus: "approved",
  };

  const normalizedSearch = search.trim();

  if (normalizedSearch) {
    const searchRegex = {
      $regex: normalizedSearch,
      $options: "i",
    };

    const matchingUsers = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
      ],
    }).select("_id");

    const matchingUserIds = matchingUsers.map(
      (user) => user._id
    );

    hostFilter.$or = [
      {
        organizationName: searchRegex,
      },
      {
        user: {
          $in: matchingUserIds,
        },
      },
    ];
  }

  const hosts = await Host.find(hostFilter)
    .populate(
      "user",
      "name email isBlocked isVerified role created_at"
    )
    .sort({ created_at: -1 });

  const filteredHosts = hosts.filter(
    (host) => host.user
  );

  const finalHosts = filteredHosts.filter((host) => {
    if (
      blocked === "true" &&
      host.user.isBlocked !== true
    ) {
      return false;
    }

    if (
      blocked === "false" &&
      host.user.isBlocked !== false
    ) {
      return false;
    }

    if (
      verified === "true" &&
      host.user.isVerified !== true
    ) {
      return false;
    }

    if (
      verified === "false" &&
      host.user.isVerified !== false
    ) {
      return false;
    }

    return true;
  });

  return finalHosts;
};

export const getHostByIdService = async (hostId) => {
  if (!mongoose.Types.ObjectId.isValid(hostId)) {
    const error = new Error("Invalid host ID");
    error.statusCode = 400;
    throw error;
  }

  const host = await Host.findOne({
    _id: hostId,
    verificationStatus: "approved",
  }).populate(
    "user",
    "name email isBlocked isVerified role created_at"
  );

  if (!host) {
    const error = new Error("Host not found");
    error.statusCode = 404;
    throw error;
  }

  return host;
};

export const blockAndUnblockHostService = async (hostId) => {
  if (!mongoose.Types.ObjectId.isValid(hostId)) {
    const error = new Error("Invalid host ID");
    error.statusCode = 400;
    throw error;
  }

  const host = await Host.findOne({
    _id: hostId,
    verificationStatus: "approved",
  });

  if (!host) {
    const error = new Error("Host not found");
    error.statusCode = 404;
    throw error;
  }

  const user = await User.findById(host.user);

  if (!user) {
    const error = new Error(
      "Host user account not found"
    );
    error.statusCode = 404;
    throw error;
  }

  user.isBlocked = !user.isBlocked;

  await user.save();

  return {
    isBlocked: user.isBlocked,
    message: user.isBlocked
      ? "Host blocked successfully"
      : "Host unblocked successfully",
  };
};