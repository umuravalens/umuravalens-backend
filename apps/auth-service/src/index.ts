import cors from "cors";
import express from "express";
import morgan from "morgan";
import { logger, ok } from "@umurava/shared-utils";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import authRoutes from "./routes/authRoutes";
import { errorHandler, notFound } from "./middlewares/error";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("combined", { stream: { write: (message) => logger.info({ message: message.trim() }) } }));
app.get("/health", (_req, res) => res.json(ok({ service: "auth-service", status: "up" })));
app.use("/", authRoutes);
app.use(notFound);
app.use(errorHandler);

connectDb(env.mongodbUri).then(() => {
  app.listen(env.port, () => logger.info({ message: `Auth service running on port ${env.port}` }));
}).catch((error) => {
  logger.error({ message: "Failed to start auth service", error });
  process.exit(1);
});
