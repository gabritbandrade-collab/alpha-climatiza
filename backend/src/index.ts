import "dotenv/config";
import path from "path";
import cors from "cors";
import express from "express";

import authRoutes from "./routes/auth";
import clientsRoutes from "./routes/clients";
import employeesRoutes from "./routes/employees";
import servicesRoutes from "./routes/services";
import dashboardRoutes from "./routes/dashboard";
import notificationsRoutes from "./routes/notifications";
import reportsRoutes from "./routes/reports";
import uploadRoutes from "./routes/upload";
import serviceRequestsRoutes from "./routes/serviceRequests";
import schedulingRoutes from "./routes/scheduling";
import distributionRoutes from "./routes/distribution";
import { UPLOADS_DIR } from "./lib/upload";

const app = express();
const PORT = process.env.PORT || 3333;

// CORS_ORIGIN can be a comma-separated list of allowed frontend URLs in
// production (e.g. "https://app.example.com"). Left unset, all origins are
// allowed, which is fine for local development and for a first deploy.
const corsOrigins = process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean);
app.use(cors(corsOrigins ? { origin: corsOrigins } : undefined));
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOADS_DIR));

app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use("/api/auth", authRoutes);
app.use("/api/clients", clientsRoutes);
app.use("/api/employees", employeesRoutes);
app.use("/api/services", servicesRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/service-requests", serviceRequestsRoutes);
app.use("/api/scheduling", schedulingRoutes);
app.use("/api/distribution", distributionRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Erro interno do servidor." });
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
