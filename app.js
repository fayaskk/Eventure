import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import userRoutes from "./routes/user.routes.js";

export const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));


app.use(express.static(path.join(__dirname, "public")));


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));


app.get("/", (req, res) => {
    res.render("home");
});
app.use("/api/users", userRoutes);