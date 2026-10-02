import express from "express";

const router = express.Router();

router.get("/admin/dashboard", (req, res) => {
  res.render("admin/dashboard");
});

router.get("/admin/users", (req, res) => {
  res.render("admin/users");
});

router.get("/admin/users/:id", (req, res) => {
  res.render("admin/user-details");
});

router.get("/admin/host-applications", (req, res) => {
  res.render("admin/host-applications");
});

router.get("/admin/host-applications/:id", (req, res) => {
  res.render("admin/host-application-details");
});

router.get("/admin/hosts", (req, res) => {
  res.render("admin/hosts");
});

router.get("/admin/hosts/:id", (req, res) => {
  res.render("admin/host-details");
});
router.get("/admin/profile", (req, res) => {
  res.render("admin/admin-profile");
});
export default router;