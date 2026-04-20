import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.AUTH_SERVICE_PORT || 8081),
  mongodbUri: process.env.AUTH_MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "",
  accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  resetTokenExpiryMinutes: Number(process.env.RESET_TOKEN_EXPIRY_MINUTES || 15),
  appBaseUrl: process.env.APP_BASE_URL || "http://localhost:3000",
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpSecure: process.env.SMTP_SECURE === "true",
  emailFrom: process.env.EMAIL_FROM || process.env.SMTP_USER || "no-reply@umurava.local",
  googleClientId: process.env.GOOGLE_CLIENT_ID || ""
};
