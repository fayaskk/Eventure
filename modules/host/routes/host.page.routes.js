import express from "express";

const router = express.Router();

router.get("/host/dashboard", (req, res) => {
  res.render("host/dashboard");
});

router.get("/host/profile", (req, res) => {
  res.render("host/profile");
});

router.get("/host/profile/edit", (req, res) => {
  res.render("host/edit-profile");
});

router.get("/host/events/create", (req, res) => {
  res.render("host/create-event");
});

router.get("/host/events", (req, res) => {
  res.render("host/events", {
    title: "Eventure | My Events",
  });
});

router.get("/host/events/:eventId/edit", (req, res) =>
  res.render("host/edit-event", {
    title: "Eventure | Edit Event",
  }),
);

router.get("/host/events/:eventId", (req, res) => {
  res.render("host/event-details", {
    title: "Eventure | Event Details",
  });
});

export default router;
