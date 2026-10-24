import express from "express";

const router = express.Router();

router.get("/dashboard", (req, res) => {
  res.render("user/dashboard", {
    title: "Dashboard | Eventure",
  });
});

router.get("/profile", (req, res) => {
  res.render("user/profile", {
    title: "My Profile | Eventure",
  });
});

router.get("/edit-profile", (req, res) => {
  res.render("user/edit-profile", {
    title: "Edit Profile | Eventure",
  });
});

router.get("/apply-host", (req, res) => {
  res.render("user/apply-host", {
    title: "Apply as Host | Eventure",
  });
});

router.get("/host-application", (req, res) => {
  res.render("user/host-application");
});

router.get("/user/bookings", (req, res) => {
  res.render("user/bookings", {
    title: "My Tickets | Eventure",
    activePage: "bookings",
  });
});

router.get("/user/tickets/:bookingId", (req, res) => {
  res.render("user/ticket", {
    title: "Digital Ticket | Eventure",
    activePage: "bookings",
  });
});

export default router;
