import "dotenv/config";
import process from "process";
import { startBookingExpirationJob } from "./jobs/expireBookings.job.js";
import { connectDB } from "./config/db.js";
import { app } from "./app.js";

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    startBookingExpirationJob();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};
startServer();