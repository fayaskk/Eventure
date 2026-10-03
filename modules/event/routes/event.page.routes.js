import express from "express";
const router = express.Router()


router.get("/", (req, res) => {
  res.render("events", {
    title: "Eventure | Discover Events",
  });
});

export default router;