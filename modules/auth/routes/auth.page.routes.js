
import express from "express";
const router = express.Router();

router.get("/", (req, res) => {
  res.render("home", {
    title: "Eventure | Discover Events",
  });
});

router.get("/login", (req, res) => {
  res.render("auth/login", {
    title: "Login | Eventure",
  });
});

router.get("/register", (req, res) => {
  res.render("auth/register", {
    title: "Create Account | Eventure",
  });
});

router.get("/verify-otp", (req, res) => {
  res.render("auth/verify-otp");
});

router.get("/forgot-password", (req, res) => {
  res.render("auth/forgot-password");
});

router.get("/verify-reset-otp", (req, res) => {
  res.render("auth/verify-reset-otp");
});

router.get("/reset-password", (req, res) => {
  res.render("auth/reset-password");
});



export default router;
