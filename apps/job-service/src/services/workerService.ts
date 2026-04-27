import { Worker } from "bullmq";
import IORedis from "ioredis";
import { Job } from "../models/Job";
import { logger } from "@umurava/shared-utils";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const startJobWorker = () => {
  const worker = new Worker(
    "job-metrics-queue",
    async (jobBatch) => {
      const { jobId, action, metric, sourceCode } = jobBatch.data;
      const increment = action === "increment" ? 1 : -1;

      try {
        const updateData: any = { $inc: {} };
        
        if (metric === "applicantCount") {
          updateData.$inc.applicantCount = increment;
          
          if (sourceCode) {
            // Update source-specific count as well
            await Job.updateOne(
              { _id: jobId, "sources.code": sourceCode },
              { $inc: { "sources.$.applicantCount": increment } }
            );
          }
        } else if (metric === "unverifiedFilesCount") {
          updateData.$inc.unverifiedFilesCount = increment;
        }

        await Job.findByIdAndUpdate(jobId, updateData);
        logger.info({ message: `Updated job ${jobId} metrics: ${metric} ${action}`, metric, action, jobId });
      } catch (error) {
        logger.error({ message: `Failed to update job metrics for ${jobId}`, error });
      }
    },
    { connection }
  );

  worker.on("completed", (jobBatch) => {
    logger.debug({ message: `Job metric update completed: ${jobBatch.id}` });
  });

  worker.on("failed", (jobBatch, err) => {
    logger.error({ message: `Job metric update failed: ${jobBatch?.id}`, error: err });
  });

  logger.info({ message: "Job metrics worker started" });
  return worker;
};
