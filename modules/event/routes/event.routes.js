import express from "express"
import { getEventById, getEvents,  getFeaturedEvents, getHighlightedEvents, getMostBookedEvents} from "../controllers/event.controller.js"

const router = express.Router()

router.get("/", getEvents);
router.get("/highlighted", getHighlightedEvents);
router.get("/featured", getFeaturedEvents);
router.get("/most-booked", getMostBookedEvents);
router.get("/:eventId", getEventById);

export default router;
