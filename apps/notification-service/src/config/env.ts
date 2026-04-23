import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: Number(process.env.NOTIFICATION_SERVICE_PORT || 8085),
  smtpHost: process.env.SMTP_HOST || "smtp.gmail.com",
  smtpPort: Number(process.env.SMTP_PORT || 587),
  smtpSecure: process.env.SMTP_SECURE === "true",
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  emailFrom: process.env.EMAIL_FROM || "UmuravaLens <no-reply@umurava.rw>",
};

