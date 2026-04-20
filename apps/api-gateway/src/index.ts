import cors from "cors";
import express from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { logger, ok } from "@umurava/shared-utils";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { errorHandler, notFound } from "./middlewares/error";
import gatewayRoutes from "./routes/gatewayRoutes";

/** Treat http://localhost:P and http://127.0.0.1:P as the same when matching allowlist. */
function isCorsOriginAllowed(requestOrigin: string, allowed: string[]): boolean {
  if (allowed.includes(requestOrigin)) return true;
  try {
    const u = new URL(requestOrigin);
    const altHost =
      u.hostname === "localhost"
        ? "127.0.0.1"
        : u.hostname === "127.0.0.1"
          ? "localhost"
          : null;
    if (!altHost) return false;
    const alt = u.port ? `${u.protocol}//${altHost}:${u.port}` : `${u.protocol}//${altHost}`;
    return allowed.includes(alt);
  } catch {
    return false;
  }
}

const app = express();

const corsOptions: cors.CorsOptions = {
  origin(origin, callback) {
    // Allow non-browser tools and same-origin requests with no Origin header.
    if (!origin) {
      callback(null, true);
      return;
    }

    if (!env.corsOrigins.length || isCorsOriginAllowed(origin, env.corsOrigins)) {
      callback(null, true);
      return;
    }

    logger.warn({ message: "CORS origin rejected; add it to CORS_ORIGINS", origin });
    callback(null, false);
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-user-id"],
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(morgan("combined", { stream: { write: (message) => logger.info({ message: message.trim() }) } }));

app.get("/health", (_req, res) => res.json(ok({ service: "api-gateway", status: "up" })));
app.get("/api/v3", (_req, res) => res.json(swaggerSpec));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/", gatewayRoutes);
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => logger.info({ message: `API gateway running on port ${env.port}` }));
