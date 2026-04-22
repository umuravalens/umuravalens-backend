import dotenv from "dotenv";

dotenv.config();

const parseCorsOrigins = (): string[] => {
  const raw = process.env.CORS_ORIGINS || "";
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

export const env = {
  port: Number(process.env.API_GATEWAY_PORT || 8080),
  jwtSecret: process.env.JWT_SECRET || "",
  identityServiceUrl: process.env.IDENTITY_SERVICE_URL || "http://identity-service:8081",
  jobServiceUrl: process.env.JOB_SERVICE_URL || "http://job-service:8082",
  applicantServiceUrl: process.env.APPLICANT_SERVICE_URL || "http://applicant-service:8083",
  screeningServiceUrl: process.env.SCREENING_SERVICE_URL || "http://screening-service:8084",
  corsOrigins: parseCorsOrigins()
};
