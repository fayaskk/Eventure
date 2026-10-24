import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../../../models/user.model.js";

const router = express.Router();

const requireHostPage = async (req, res, next) => {
  try {
    const token = req.cookies?.eventureToken;

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded.userId) {
      return res.redirect("/login");
    }

    const user = await User.findById(decoded.userId);

    if (!user || user.isDeleted) {
      return res.redirect("/login");
    }

    if (user.isBlocked || user.role !== "host") {
      return res.status(403).render("errors/403");
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    return next();
  } catch (error) {
    if (
      error.name === "TokenExpiredError" ||
      error.name === "JsonWebTokenError"
    ) {
      return res.redirect("/login");
    }

    console.error("Host page authorization error:", error);

    return res.status(500).send("Unable to verify your account.");
  }
};

router.use("/host", requireHostPage);

router.get("/host/dashboard", (req, res) => {
  return res.render("host/dashboard");
});

router.get("/host/profile", (req, res) => {
  return res.render("host/profile");
});

router.get("/host/profile/edit", (req, res) => {
  return res.render("host/edit-profile");
});

router.get("/host/events/create", (req, res) => {
  return res.render("host/create-event");
});

router.get("/host/events", (req, res) => {
  return res.render("host/events", {
    title: "Eventure | My Events",
  });
});

router.get("/host/events/:eventId/edit", (req, res) => {
  return res.render("host/edit-event", {
    title: "Eventure | Edit Event",
  });
});

router.get("/host/events/:eventId", (req, res) => {
  return res.render("host/event-details", {
    title: "Eventure | Event Details",
  });
});

export default router;
