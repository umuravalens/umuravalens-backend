import cors from "cors";
import express from "express";
import morgan from "morgan";
import { logger, ok, getUnderstandableMessage } from "@umurava/shared-utils";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middlewares/error";
import jobRoutes from "./routes/jobRoutes";
import { startJobWorker } from "./services/workerService";

const app = express();
app.use(cors());
app.use(express.json());
app.use(
  morgan("combined", {
    stream: { write: (message) => logger.info({ message: message.trim() }) },
  })
);

app.get("/health", (_req, res) => res.json(ok({ service: "job-service", status: "up" })));
app.use("/", jobRoutes);

app.use(notFound);
app.use(errorHandler);

connectDb(env.mongodbUri)
  .then(() => {
    app.listen(env.port, () => {
      logger.info({ message: `Job service running on port ${env.port}` });
      startJobWorker();
    });
  })
  .catch((error) => {
    logger.error({ message: getUnderstandableMessage(error), error });
    process.exit(1);
  });
