import express from "express";
import { health } from "../routes/health";
const app = express();
app.use(health);
app.get("/api/version", (_req, res) => res.json({ version: process.env.APP_VERSION ?? "dev" }));
app.listen(process.env.PORT ?? 3000, () => console.log("api up"));
