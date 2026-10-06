import express from "express";
import path from "path";
import passport from "passport";
import "./config/passport.js";
import { fileURLToPath } from "url";

import adminRoutes from "./modules/admin/routes/admin.routes.js";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import userRoutes from "./modules/user/routes/user.routes.js";
import hostRoutes from "./modules/host/routes/host.routes.js";
import pageRoutes from "./modules/auth/routes/auth.page.routes.js";
import userPageRoutes from "./modules/user/routes/user.page.routes.js";
import adminPageRoutes from "./modules/admin/routes/admin.page.routes.js";
import hostPageRoutes from "./modules/host/routes/host.page.routes.js";
import hostApplicationRoutes from "./modules/host/routes/hostApplication.routes.js";
import categoryRoutes from "./modules/category/routes/category.routes.js"
import eventRoutes from "./modules/event/routes/event.routes.js"
import eventPageRoutes from "./modules/event/routes/event.page.routes.js";
import hostEventRoutes from "./modules/event/routes/hostEvent.routes.js"
import adminEventRoutes from "./modules/event/routes/adminEvent.routes.js"
import eventReportRoutes from "./modules/eventReport/routes/eventReport.routes.js"
import adminEventReportRoutes from "./modules/eventReport/routes/adminEventReport.routes.js"
import bookingRoutes from "./modules/booking/routes/booking.routes.js"
import paymentRoutes from "./modules/payment/routes/payment.routes.js"
import paymentPageRoutes from "./modules/payment/routes/payment.page.routes.js";
export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.use(passport.initialize());

app.use("/", pageRoutes);
app.use("/", userPageRoutes);
app.use("/", adminPageRoutes);
app.use("/", hostPageRoutes);
app.use("/", eventPageRoutes);

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/host-applications", hostApplicationRoutes);
app.use("/api/host", hostRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/events", eventRoutes)
app.use("/api/host/events", hostEventRoutes)
app.use("/api/admin/events", adminEventRoutes)


app.use("/api/events", eventReportRoutes);
app.use("/api/admin/event-reports", adminEventReportRoutes);

app.use("/api/events/bookings", bookingRoutes);

app.use("/api/payments", paymentRoutes)
app.use("/payment", paymentPageRoutes);
app.use("/api", (req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

app.use((req, res) => {
  res.status(404).render("errors/404");
});
