import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.SCREENING_SERVICE_PORT || 8084),
  mongodbUri: process.env.SCREENING_MONGODB_URI || "",
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  applicantServiceUrl: process.env.APPLICANT_SERVICE_URL || "http://localhost:8083",
  jobServiceUrl: process.env.JOB_SERVICE_URL || "http://localhost:8082",
  identityServiceUrl: process.env.IDENTITY_SERVICE_URL || "http://localhost:8081",
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:8085",
};

