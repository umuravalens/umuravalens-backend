import cors from "cors";
import express from "express";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { logger, ok } from "@umurava/shared-utils";
import { env } from "./config/env";
import { swaggerSpec } from "./config/swagger";
import { errorHandler, notFound } from "./middlewares/error";
import gatewayRoutes from "./routes/gatewayRoutes";

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan("combined", { stream: { write: (message) => logger.info({ message: message.trim() }) } }));

app.get("/health", (_req, res) => res.json(ok({ service: "api-gateway", status: "up" })));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use("/", gatewayRoutes);
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, () => logger.info({ message: `API gateway running on port ${env.port}` }));
