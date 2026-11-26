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

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();

    const server = createServer(app);

    initializeSocket(server);

    startBookingExpirationJob();
    startEventCompletionJob();
    startTicketCancellationRefundJob();

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Server startup error:", error);
    process.exit(1);
  }
};

startServer();