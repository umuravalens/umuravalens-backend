import nodemailer from "nodemailer";
import { env } from "../config/env";
import { logger } from "@umurava/shared-utils";

const transporter = nodemailer.createTransport({
  host: env.smtpHost,
  port: env.smtpPort,
  secure: env.smtpSecure,
  auth: {
    user: env.smtpUser,
    pass: env.smtpPass,
  },
});

export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: env.emailFrom,
      to,
      subject,
      html,
    });
    logger.info({ message: "Email sent successfully", to, subject });
  } catch (error: any) {
    logger.error({ message: "Failed to send email", error: error.message, to });
  }
};
