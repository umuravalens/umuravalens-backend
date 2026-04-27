import http from "http";
import axios from "axios";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { logger } from "@umurava/shared-utils";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { Screening } from "./models/Screening";
import { rankApplicants } from "./services/rankingService";

const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

// Minimal health server
const healthServer = http.createServer((req, res) => {
  logger.info({ message: `Health check request received: ${req.url}` });
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: { status: "up", service: "worker-service" } }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

const boot = async () => {
  await connectDb(env.mongodbUri);
  healthServer.listen(env.port, () => {
    logger.info({ message: `Worker health server running on port ${env.port}` });
  });
  logger.info({ message: "Worker service is running (active workers moved to specialized services)" });
};
boot().catch((error)=>{logger.error({message:"Worker failed to start",error});process.exit(1);});
