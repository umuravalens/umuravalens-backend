import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.APPLICANT_SERVICE_PORT || 8083),
  mongodbUri: process.env.APPLICANT_MONGODB_URI || "",
  uploadDir: process.env.UPLOAD_DIR || path.resolve(__dirname, "../uploads"),
  jobServiceUrl: process.env.JOB_SERVICE_URL || "http://localhost:8082",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  geminiModel: process.env.GEMINI_MODEL || "gemini-2.5-flash-lite"
};
