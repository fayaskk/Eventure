import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const requireHostPage = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    const cookieToken = req.cookies?.token;

    let token = null;

    if (authorization?.startsWith("Bearer ")) {
      token = authorization.split(" ")[1];
    } else if (cookieToken) {
      token = cookieToken;
    }

    if (!token) {
      return res.redirect("/login");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user || user.isBlocked) {
      return res.redirect("/login");
    }

    if (user.role !== "host") {
      return res.status(403).render("errors/403", {
        title: "Access Denied | Eventure",
        message: "You do not have permission to access host features."
      });
    }

    req.user = {
      userId: user._id.toString(),
      role: user.role
    };

    next();
  } catch (error) {
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.redirect("/login");
    }

    console.error("Host page authorization error:", error);

    return res.status(500).render("errors/500", {
      title: "Server Error | Eventure"
    });
  }
};