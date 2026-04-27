import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.JOB_SERVICE_PORT || 8082),
  mongodbUri: process.env.JOB_MONGODB_URI || "",
  defaultSourceName: process.env.DEFAULT_SOURCE_NAME || "Umurava",
  defaultSourceCode: process.env.DEFAULT_SOURCE_CODE || "umrv_plt"
};
