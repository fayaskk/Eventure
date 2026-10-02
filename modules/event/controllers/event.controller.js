import {
  getPublicEventsService,
  getPublicEventByIdService,
} from "../../../services/event.service.js";


export const getEvents = async (req, res) => {
  try {
    const {
      search = "",
      category,
      page = "1",
      limit = "8",
      sort = "newest",
    } = req.query;

    const normalizedSearch = typeof search === "string" ? search.trim() : "";
    console.log("category:", category);
    const normalizedCategory =
      typeof category === "string" ? category.trim().toLowerCase() : "";
    console.log("normalizedCategory :", normalizedCategory);
    const currentPage = Number(page);
    const currentLimit = Number(limit);

    const allowedSorts = ["newest", "oldest"];

    if (!Number.isInteger(currentPage) || currentPage < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer",
      });
    }

    if (
      !Number.isInteger(currentLimit) ||
      currentLimit < 1 ||
      currentLimit > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100",
      });
    }

    if (!allowedSorts.includes(sort)) {
      return res.status(400).json({
        success: false,
        message: "Sort must be  newest or oldest",
      });
    }

    const result = await getPublicEventsService(
      normalizedSearch,
      normalizedCategory,
      currentPage,
      currentLimit,
      sort,
    );

    return res.status(200).json({
      success: true,
      message: "Events fetched successfully",
      events: result.events,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error("Events error:", error);

    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error",
    });
  }
};

export const getEventById = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await getPublicEventByIdService(eventId);

    return res.status(200).json({
      success: true,
      message: "Event fetched successfully",
      event,
    });
  } catch (error) {
    console.error("Get event by Id error:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
};
