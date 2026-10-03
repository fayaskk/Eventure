import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import process from "process"

export const authMiddleware = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const [type, token] = auth.split(" ");

    if (type !== "Bearer") {
      return res.status(401).json({
        success: false,
        message: "Invalid authorization format",
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Token not found",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(
      decoded.userId
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has been blocked by the administrator.",
        blocked: true,
      });
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    console.error(
      "Auth middleware error:",
      error
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};