import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.WORKER_SERVICE_PORT || 8086),
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  mongodbUri: process.env.SCREENING_MONGODB_URI || "",
  applicantServiceUrl: process.env.APPLICANT_SERVICE_URL || "http://localhost:8083",
  jobServiceUrl: process.env.JOB_SERVICE_URL || "http://localhost:8082",
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8085"
};
