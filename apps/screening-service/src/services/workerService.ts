import axios from "axios";
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { env } from "../config/env";
import { Screening } from "../models/Screening";
import { analyzeMatch } from "./aiService";
import { logger } from "@umurava/shared-utils";

const connection = new IORedis(env.redisUrl, { maxRetriesPerRequest: null });

export const startWorker = () => {
  const worker = new Worker(
    "screening-queue",
    async (job) => {
      const { screeningId, jobId } = job.data;
      
      try {
        const screening = await Screening.findById(screeningId);
        if (!screening) return;

        screening.status = "processing";
        await screening.save();

        // 1. Get Job details
        const jobRes = await axios.get(`${env.jobServiceUrl}/jobs/internal/${jobId}`);
        const jobData = jobRes.data.data;

        // 2. Get Applicants for this job
        const applicantRes = await axios.get(`${env.applicantServiceUrl}/applicants/internal/${jobId}`);
        const applicants = applicantRes.data.data?.items || [];

        // Consistency check: Ensure the list matches the expected count
        if (applicants.length !== jobData.applicantCount) {
            logger.error({ 
                message: "Applicant count mismatch during screening", 
                jobId, 
                expected: jobData.applicantCount, 
                found: applicants.length 
            });
            throw new Error("error fetching applicants");
        }

        screening.progress.total = applicants.length;
        screening.stats.totalApplicants = applicants.length;
        await screening.save();

        let topScore = 0;
        let shortlistedCount = 0;

        for (let i = 0; i < applicants.length; i++) {
          // Re-fetch screening to check if it was stopped
          const currentScreening = await Screening.findById(screeningId);
          if (!currentScreening || currentScreening.status === "stopped") {
            logger.info({ message: "Screening stopped by user", screeningId });
            return;
          }

          const applicant = applicants[i];
          
          try {
            // Stage: AI Analysis
            const matchResult = await analyzeMatch(jobData, applicant);
            
            // Save to Applicant
            await axios.patch(`${env.applicantServiceUrl}/applicants/internal/${applicant._id}/ai`, {
              aiAnalysis: {
                matchScore: matchResult.matchScore,
                explanation: matchResult.explanation,
                rank: 0
              }
            });

            if (matchResult.matchScore >= (jobData.shortlist || 70)) {
               shortlistedCount++;
            }
            if (matchResult.matchScore > topScore) {
                topScore = matchResult.matchScore;
            }

            // Update Progress
            currentScreening.progress.finished = i + 1;
            currentScreening.stats.shortlistedCount = shortlistedCount;
            currentScreening.stats.topScore = topScore;
            await currentScreening.save();

            // Emit Progress via Notification Service (WebSockets)
            await axios.post(`${env.notificationServiceUrl}/notifications/emit`, {
              event: "screening_progress",
              data: {
                screeningId,
                jobId,
                jobName: jobData.title,
                finished: i + 1,
                total: applicants.length,
                percentage: Math.round(((i + 1) / applicants.length) * 100)
              }
            }).catch(e => logger.warn({ message: "Failed to emit progress", error: e.message }));

          } catch (err: any) {
            let reason = err.message;
            // Clean up the error message if it's the specific filesystem error
            if (reason.startsWith("Critical document missing from filesystem:")) {
                const docName = reason.split(":")[1]?.split("(")[0]?.trim() || "document";
                reason = `${docName} missing`;
            }

            logger.error({ 
                message: `Failed to screen ${applicant.name}: ${reason}`, 
                applicantId: applicant._id, 
                error: err.message 
            });
          }
        }

        // Mark Completed
        screening.status = "completed";
        screening.completedAt = new Date();
        await screening.save();

        // Notify Recruiter via Email if enabled
        const userRes = await axios.get(`${env.identityServiceUrl}/internal/users/${screening.recruiterId}`);
        const user = userRes.data.data;

        const emailRequired = user?.notifications?.emailOnScreeningDone !== false;

        await axios.post(`${env.notificationServiceUrl}/notifications/emit`, {
          event: "screening_finished",
          data: {
            screeningId,
            jobId,
            jobName: jobData.title,
            recruiterEmail: user.email,
            sendEmail: emailRequired,
            stats: screening.stats
          }
        }).catch(e => logger.warn({ message: "Failed to emit finished event", error: e.message }));

      } catch (error: any) {
        logger.error({ message: "Worker job failed", error: error.message, screeningId });
        await Screening.findByIdAndUpdate(screeningId, { status: "failed", error: error.message });

        // Emit Failure via Notification Service
        await axios.post(`${env.notificationServiceUrl}/notifications/emit`, {
          event: "screening_failed",
          data: {
            screeningId,
            jobId,
            error: error.message
          }
        }).catch(e => logger.warn({ message: "Failed to emit failed event", error: e.message }));
      }
    },
    { connection, concurrency: 1 }
  );

  worker.on("completed", (job) => {
    logger.info({ message: "Screening job completed", jobId: job.id });
  });

  worker.on("failed", (job, err) => {
    logger.error({ message: "Screening job failed", jobId: job?.id, error: err.message });
  });
};
