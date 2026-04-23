import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const jobMetricsQueue = new Queue("job-metrics-queue", { connection });

export const emitJobMetricsUpdate = async (jobId: string, action: "increment" | "decrement") => {
  await jobMetricsQueue.add(`update-${jobId}`, { jobId, action });
};
