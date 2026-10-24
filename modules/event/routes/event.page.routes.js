import express from "express";
import process from "process"
const router = express.Router();

router.get("/", (req, res) => {
  res.render("events", {
    title: "Eventure | Discover Events",
    activePage: "home",
    isLoggedIn: false,
  });
});

router.get("/events", (req, res) => {
  res.render("events", {
    title: "Eventure | Discover Events",
    activePage: "events",
    isLoggedIn: false,
  });
});

router.get("/events/:eventId", (req, res) => {
  res.render("event-details", {
    title: "Eventure | Event Details",
    activePage: "events",
    isLoggedIn: false,
  });
});

router.get("/booking/:eventId", (req, res) => {
  res.render("booking", {
    title: "Eventure | Book Tickets",
    activePage: "events",
    razorpayKeyId: process.env.RAZORPAY_KEY_ID,
  });
});

export default router;
