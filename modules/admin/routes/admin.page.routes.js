import express from "express";

const router = express.Router();

router.get("/admin/dashboard", (req, res) => {
  res.render("admin/dashboard", {
    title: "Eventure | Admin Dashboard",
  });
});

router.get("/admin/users", (req, res) => {
  res.render("admin/users", {
    title: "Eventure | Eventure Users",
  });
});

router.get("/admin/users/:id", (req, res) => {
  res.render("admin/user-details", {
    title: "Eventure | User Details",
  });
});

router.get("/admin/host-applications", (req, res) => {
  res.render("admin/host-applications", {
    title: "Eventure | Host Applications",
  });
});

router.get("/admin/host-applications/:id", (req, res) => {
  res.render("admin/host-application-details", {
    title: "Eventure | Host Application Details",
  });
});

router.get("/admin/hosts", (req, res) => {
  res.render("admin/hosts", {
    title: "Eventure | Eventure Hosts",
  });
});

router.get("/admin/hosts/:id", (req, res) => {
  res.render("admin/host-details", {
    title: "Eventure | Host Details",
  });
});

router.get("/admin/event-applications", (req, res) => {
  res.render("admin/event-applications", {
    title: "Eventure | Event Applications",
  });
});

router.get("/admin/event-applications/:id", (req, res) => {
  res.render("admin/event-application-details", {
    title: "Eventure | Event Application Details",
  });
});

router.get("/admin/event-edit-requests", (req, res) => {
  res.render("admin/event-edit-requests", {
    activePage: "event-edit-requests",
    title: "Eventure | Event Edit Requests",
  });
});

router.get("/admin/events", (req, res) => {
  res.render("admin/events", {
    title: "Eventure | Manage Events",
  });
});

router.get("/admin/reported-events", (req, res) => {
  res.render("admin/reported-events", {
    title: "Eventure | Reported Events",
  });
});

router.get("/admin/reported-events/:eventId", (req, res) => {
  res.render("admin/reported-eventDetails", {
    title: "Eventure | Event Reports",
  });
});

router.get("/admin/profile", (req, res) => {
  res.render("admin/admin-profile", {
    title: "Eventure | Admin Profile",
  });
});

export default router;
