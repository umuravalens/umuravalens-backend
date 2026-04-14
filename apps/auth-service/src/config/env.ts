import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.AUTH_SERVICE_PORT || 8081),
  mongodbUri: process.env.AUTH_MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  resetTokenExpiryMinutes: Number(process.env.RESET_TOKEN_EXPIRY_MINUTES || 15)
};
