import { Queue } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export type JobMetricType = "applicantCount" | "unverifiedFilesCount";

export interface MetricUpdatePayload {
  jobId: string;
  action: "increment" | "decrement";
  metric: JobMetricType;
  sourceCode?: string;
}

export const jobMetricsQueue = new Queue("job-metrics-queue", { connection });

export const emitJobMetricsUpdate = async (payload: MetricUpdatePayload) => {
  await jobMetricsQueue.add(`update-${payload.jobId}-${payload.metric}`, payload);
};
