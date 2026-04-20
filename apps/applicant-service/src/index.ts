import cors from "cors";
import express from "express";
import morgan from "morgan";
import fs from "fs";
import path from "path";
import { logger, ok } from "@umurava/shared-utils";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middlewares/error";
import applicantRoutes from "./routes/applicantRoutes";

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan("combined", { stream: { write: (message) => logger.info({ message: message.trim() }) } }));

const uploadAbs = path.resolve(env.uploadDir);
if (!fs.existsSync(uploadAbs)) {
  fs.mkdirSync(uploadAbs, { recursive: true });
}
logger.info({ message: "Serving uploads from disk", path: uploadAbs });

app.use("/uploads", express.static(uploadAbs, { setHeaders: (res) => res.setHeader("Cache-Control", "private, max-age=3600") }));

app.get("/health", (_req, res) => res.json(ok({ service: "applicant-service", status: "up" })));
app.use("/", applicantRoutes);
app.use(notFound);
app.use(errorHandler);

connectDb(env.mongodbUri)
  .then(() => {
    app.listen(env.port, () => logger.info({ message: `Applicant service running on port ${env.port}` }));
  })
  .catch((error) => {
    logger.error({ message: "Failed to start applicant service", error });
    process.exit(1);
  });
