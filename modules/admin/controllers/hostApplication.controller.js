import {
  getHostApplicationsService,
  getHostApplicationByIdService,
  getHostApplicationDocumentService,
  approveHostApplicationService,
  rejectHostApplicationService,
} from "../../../services/hostApplication.service.js";

export const getHostApplications = async (req, res) => {
  try {
    const { search = "", status, page, limit } = req.query;

    const result = await getHostApplicationsService({
      search,
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Host applications fetched successfully",
      applications: result.applications,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Get host applications error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const getHostApplicationById = async (req, res) => {
  try {
    const { id } = req.params;

    const hostApplication = await getHostApplicationByIdService(id);

    return res.status(200).json({
      success: true,
      message: "Application fetched successfully",
      hostApplication,
    });
  } catch (error) {
    console.error("Get host application error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const viewHostApplicationDocument = async (req, res) => {
  try {
    const { id, documentType } = req.params;

    const filePath = await getHostApplicationDocumentService(id, documentType);

    return res.sendFile(filePath, (error) => {
      if (error && !res.headersSent) {
        console.error("Send host document error:", error);

        return res.status(404).json({
          success: false,
          message: "Unable to open document",
        });
      }
    });
  } catch (error) {
    console.error("View host application document error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const approveHostApplication = async (req, res) => {
  try {
    const { id } = req.params;

    await approveHostApplicationService(id);

    return res.status(200).json({
      success: true,
      message: "Host application approved successfully",
    });
  } catch (error) {
    console.error("Host Application Approve error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};

export const rejectHostApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const reason = await rejectHostApplicationService(id, rejectionReason);

    return res.status(200).json({
      success: true,
      message: "Host application rejected successfully",
      rejectionReason: reason,
    });
  } catch (error) {
    console.error("Host Application Rejection error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
