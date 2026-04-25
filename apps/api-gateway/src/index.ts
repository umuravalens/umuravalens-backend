import axios from "axios";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { logger, ok } from "@umurava/shared-utils";
import { createProxyMiddleware } from "http-proxy-middleware";
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
  origin: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["*"],
  credentials: true
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));
app.use(express.json());
app.use(morgan("combined", { stream: { write: (message) => logger.info({ message: message.trim() }) } }));

import fs from "fs";
import path from "path";

app.get("/health", async (_req, res) => {
  const services = [
    { name: "identity-service", url: `${env.identityServiceUrl}/health` },
    { name: "job-service", url: `${env.jobServiceUrl}/health` },
    { name: "applicant-service", url: `${env.applicantServiceUrl}/health` },
    { name: "screening-service", url: `${env.screeningServiceUrl}/health` },
    { name: "notification-service", url: `${env.notificationServiceUrl}/health` },
    { name: "worker-service", url: `${env.workerServiceUrl}/health` }
  ];

  const results = await Promise.all(
    services.map(async (s) => {
      try {
        const response = await axios.get(s.url, { timeout: 5000 });
        return { 
          name: s.name, 
          status: "up",
          indicator: "🟢",
          details: response.data.data
        };
      } catch (err: any) {
        logger.error({ message: `Health check failed for ${s.name} at ${s.url}`, error: err.message });
        return { 
          name: s.name, 
          status: "down", 
          indicator: "🔴",
          error: err.message || "Unknown error" 
        };
      }
    })
  );

  // Content negotiation: Return HTML for browsers, JSON for everything else
  if (_req.headers.accept?.includes("text/html")) {
    const serviceRows = results.map(s => `
      <div class="row">
        <span>${s.indicator} ${s.name}</span>
        <span class="status ${s.status}">${s.status.toUpperCase()}</span>
      </div>
    `).join("");

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>System Health</title>
        <style>
          body { 
            background: #09090b; 
            color: #fafafa; 
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 100vh; 
            margin: 0;
            -webkit-font-smoothing: antialiased;
          }
          .container { width: 100%; max-width: 400px; padding: 20px; }
          .header { 
            font-size: 11px; 
            text-transform: uppercase; 
            letter-spacing: 0.1em; 
            opacity: 0.4; 
            margin-bottom: 24px; 
            display: flex; 
            justify-content: space-between;
          }
          .row { 
            display: flex; 
            justify-content: space-between; 
            padding: 14px 0; 
            font-size: 14px; 
            font-weight: 500;
          }
          .status { font-variant-numeric: tabular-nums; font-weight: 600; font-size: 12px; }
          .status.up { color: #10b981; }
          .status.down { color: #ef4444; }
          a { color: inherit; text-decoration: none; opacity: 0.5; font-size: 12px; margin-top: 32px; display: block; }
          a:hover { opacity: 1; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span>System Health</span>
            <span>🟢 STABLE</span>
          </div>
          ${serviceRows}
          <div class="row" style="margin-top: 20px; opacity: 0.8; font-size: 13px;">
            <span>🟢 API Gateway</span>
            <span class="status up">ONLINE</span>
          </div>
          <a href="/docs">← Back to Documentation</a>
        </div>
      </body>
      </html>
    `;
    return res.send(html);
  }

  res.json(ok({
    service: "api-gateway",
    status: "up",
    indicator: "🟢",
    dependencies: results
  }));
});
app.get("/api/v3", (_req, res) => res.json(swaggerSpec));

app.get("/docs/asyncapi", (_req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>UmuravaLens WebSocket Documentation</title>
        <link rel="stylesheet" href="https://unpkg.com/@asyncapi/react-component@1.0.0-next.47/styles/default.min.css">
        <style>
          body { margin: 0; padding: 0; }
        </style>
      </head>
      <body>
        <div id="asyncapi"></div>
        <script src="https://unpkg.com/@asyncapi/react-component@1.0.0-next.47/browser/standalone/index.js"></script>
        <script>
          AsyncApiStandalone.render({
            schema: {
              url: "/docs/asyncapi/raw",
            },
            config: {
              show: { sidebar: true }
            },
          }, document.getElementById("asyncapi"));
        </script>
      </body>
    </html>
  `);
});

app.get("/docs/asyncapi/raw", (_req, res) => {
  const filePath = path.resolve(__dirname, "../../notification-service/docs/asyncapi.yaml");
  if (fs.existsSync(filePath)) {
    res.setHeader("Content-Type", "text/yaml");
    res.sendFile(filePath);
  } else {
    res.status(404).send("AsyncAPI specification not found");
  }
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Proxy for WebSocket notifications
app.use(
  ["/socket.io", "/ws"],
  createProxyMiddleware({
    target: env.notificationServiceUrl,
    ws: true,
    changeOrigin: true,
  })
);

// Proxy for HTTP notifications
app.use(
  "/notifications",
  createProxyMiddleware({
    target: env.notificationServiceUrl,
    changeOrigin: true,
  })
);

app.use("/", gatewayRoutes);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.port, () => logger.info({ message: `API gateway running on port ${env.port}` }));
