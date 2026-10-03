import mongoose from "mongoose";
import { Event } from "../models/event.model.js";
import { EventReport } from "../models/eventReport.model.js";
import { hideEventService } from "./event.service.js";
export const createEventReportService = async (
  eventId,
  userId,
  reason,
  description,
) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findOne({
    _id: eventId,
    status: "approved",
    isVisible: true,
  });

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  const existingReport = await EventReport.findOne({
    event: eventId,
    reportedBy: userId,
  });

  if (existingReport) {
    const error = new Error("User already reported this event");
    error.statusCode = 409;
    throw error;
  }

  const report = await EventReport.create({
    event: eventId,
    reportedBy: userId,
    reason,
    description,
  });

  return report;
};

export const getReportedEventsService = async () => {
  const pipeline = [
    {
      $group: {
        _id: "$event",
        totalReports: {
          $sum: 1,
        },
        pendingReports: {
          $sum: {
            $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
          },
        },
      },
    },
    {
      $lookup: {
        from: "events",
        localField: "_id",
        foreignField: "_id",
        as: "event",
      },
    },
    {
      $unwind: "$event",
    },
    {
      $project: {
        _id: 1,
        totalReports: 1,
        pendingReports: 1,
        eventName: "$event.eventName",
        category: "$event.category",
        eventDate: "$event.eventDate",
        status: "$event.status",
        isVisible: "$event.isVisible",
      },
    },
  ];

  const reportedEvents = await EventReport.aggregate(pipeline);

  return reportedEvents;
};

export const getReportsByEventService = async (eventId) => {
  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    const error = new Error("Invalid event ID");
    error.statusCode = 400;
    throw error;
  }

  const event = await Event.findById(eventId);

  if (!event) {
    const error = new Error("Event not found");
    error.statusCode = 404;
    throw error;
  }

  const reports = await EventReport.find({
    event: eventId,
  }).populate("reportedBy", "name email");

  return reports;
};

export const dismissEventReportService = async (reportId) => {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    const error = new Error("Invalid report ID");
    error.statusCode = 400;
    throw error;
  }

  const report = await EventReport.findById(reportId);

  if (!report) {
    const error = new Error("Event report not found");
    error.statusCode = 404;
    throw error;
  }

  if (report.status !== "pending") {
    const error = new Error("Only pending reports can be dismissed");
    error.statusCode = 400;
    throw error;
  }

  report.status = "dismissed";

  await report.save();

  return report;
};




export const resolveEventReportService = async (reportId) => {
  if (!mongoose.Types.ObjectId.isValid(reportId)) {
    const error = new Error("Invalid report ID");
    error.statusCode = 400;
    throw error;
  }

  const report = await EventReport.findById(reportId);

  if (!report) {
    const error = new Error("Event report not found");
    error.statusCode = 404;
    throw error;
  }

  if (report.status !== "pending") {
    const error = new Error("Only pending reports can be resolved");
    error.statusCode = 400;
    throw error;
  }

  await hideEventService(report.event);

  await EventReport.updateMany(
    {
      event: report.event,
      status: "pending",
    },
    {
      $set: {
        status: "resolved",
      },
    },
  );

  const resolvedReports = await EventReport.find({
    event: report.event,
    status: "resolved",
  });

  return resolvedReports;
};
