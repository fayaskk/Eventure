import express from "express";

const router = express.Router();

router.get("/dashboard", (req, res) => {
  res.redirect("/events");
});

router.get("/profile", (req, res) => {
  res.render("user/profile", {
    title: "My Profile | Eventure",
    activePage: "profile",
  });
});

router.get("/edit-profile", (req, res) => {
  res.render("user/edit-profile", {
    title: "Edit Profile | Eventure",
    activePage: "profile",
  });
});

router.get("/apply-host", (req, res) => {
  res.render("user/apply-host", {
    title: "Apply as Host | Eventure",
    activePage: "apply-host",
  });
});

router.get("/host-application", (req, res) => {
  res.render("user/host-application", {
    title: "Host Application | Eventure",
    activePage: "host-application",
  });
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

router.get("/user/attended-events", (req, res) => {
  res.render("user/attended-events", {
    title: "My Attended Events | Eventure",
    activePage: "attended-events",
  });
});

router.get("/user/wishlist", (req, res) => {
  res.render("user/wishlist", {
    title: "My Wishlist | Eventure",
    activePage: "wishlist",
  });
});


router.get("/user/wallet", (req, res) => {
  res.render("user/wallet", {
    title: "My Wallet | Eventure",
    activePage: "wallet",
  });
});

router.get("/user/transactions", (req, res) => {
  res.render("user/transaction-history", {
    title: "Transaction History | Eventure",
    activePage: "transactions",
  });
});

router.get("/user/notifications", (req, res) => {
  res.render("user/notifications", {
    title: "Notifications | Eventure",
    activePage: "notifications",
  });
});

export default router;