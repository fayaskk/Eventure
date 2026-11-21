import express from "express";
import process from "process";

const router = express.Router();

router.get("/", (req, res) => {
  res.redirect("/events");
});

router.get("/events", (req, res) => {
  res.render("events", {
    title: "Eventure | Discover Events",
    activePage: "events",
  });
});

router.get("/events/:eventId", (req, res) => {
  res.render("event-details", {
    title: "Eventure | Event Details",
    activePage: "events",
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
