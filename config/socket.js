import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (!decoded.userId) {
        return next(new Error("Invalid authentication token"));
      }

      const user = await User.findById(decoded.userId);

      if (!user || user.isDeleted) {
        return next(new Error("User not found"));
      }

      if (user.isBlocked) {
        return next(new Error("Your account has been blocked"));
      }

      socket.data.user = {
        userId: user._id.toString(),
        role: user.role,
      };

      next();
    } catch (error) {
      console.error("Socket authentication error:", error.message);
      next(new Error("Authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    console.log("Connected:", socket.id);

    const userId = socket.data.user.userId;

    socket.join(`user:${userId}`);

    console.log(`User joined room: user:${userId}`);

    socket.on("disconnect", (reason) => {
      console.log(`Disconnected: ${socket.id}`, reason);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }

  return io;
};