import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.APPLICANT_SERVICE_PORT || 8083),
  mongodbUri: process.env.APPLICANT_MONGODB_URI || "",
  uploadDir: process.env.UPLOAD_DIR || "src/uploads",
  jobServiceUrl: process.env.JOB_SERVICE_URL || "http://localhost:8082"
};
