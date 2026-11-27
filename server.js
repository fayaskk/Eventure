import "dotenv/config";
import { createServer } from "http";

import {
  startBookingExpirationJob,
  startEventCompletionJob,
  startTicketCancellationRefundJob,
} from "./jobs/cronJobs.js";

import { connectDB } from "./config/db.js";
import { app } from "./app.js";
import { initializeSocket } from "./config/socket.js";

const PORT = process.env.PORT || 8080;

const startServer = async () => {
  const server = createServer(app);
  initializeSocket(server);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });

  try {
    await connectDB();
    startBookingExpirationJob();
    startEventCompletionJob();
    startTicketCancellationRefundJob();
  } catch (error) {
    console.error("Database/startup job error:", error);
  }
};

startServer();
