import nodemailer from "nodemailer";
import { logger } from "@umurava/shared-utils";
import { env } from "../config/env";

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

let transporter: nodemailer.Transporter | null = null;

const isEmailConfigured = () => Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

const getTransporter = () => {
  if (!isEmailConfigured()) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass
      }
    });
  }

  return transporter;
};

const getGreetingName = (name: string) => String(name || "there").trim() || "there";

const getBaseStyles = () => `
  <div style="font-family: Arial, sans-serif; background:#f6f8fb; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:#ffffff; border:1px solid #e9eef5; border-radius:12px; overflow:hidden;">
      <div style="padding:20px 24px; background:linear-gradient(135deg,#0f172a,#1e293b); color:#ffffff;">
        <h1 style="margin:0; font-size:20px;">UmuravaLens</h1>
      </div>
      <div style="padding:24px;">
`;

const getFooter = () => `
      </div>
      <div style="padding:16px 24px; border-top:1px solid #edf2f7; color:#64748b; font-size:12px;">
        This is an automated message from UmuravaLens.
      </div>
    </div>
  </div>
`;

const sendEmail = async (payload: EmailPayload) => {
  const transport = getTransporter();

  if (!transport) {
    logger.warn({
      message: "SMTP not configured, email not sent",
      to: payload.to,
      subject: payload.subject
    });
    return { delivered: false };
  }

  await transport.sendMail({
    from: env.emailFrom,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text
  });

  return { delivered: true };
};

export const sendVerificationEmail = async (to: string, name: string, token: string) => {
  const verifyUrl = `${env.appBaseUrl.replace(/\/$/, "")}/verify-email?token=${encodeURIComponent(token)}`;
  const subject = "Verify your UmuravaLens account";
  const greetingName = getGreetingName(name);
  const html = `
    ${getBaseStyles()}
      <h2 style="margin:0 0 12px; color:#0f172a;">Verify your email address</h2>
      <p style="margin:0 0 18px; color:#334155;">Hi ${greetingName}, welcome to UmuravaLens. Confirm your email to activate your account.</p>
      <a href="${verifyUrl}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600;">Verify Email</a>
      <p style="margin:18px 0 8px; color:#475569;">If the button does not work, use this link:</p>
      <p style="margin:0; word-break:break-all;"><a href="${verifyUrl}">${verifyUrl}</a></p>
    ${getFooter()}
  `;
  const text = `Hi ${greetingName}, verify your UmuravaLens account using this link: ${verifyUrl}`;

  return sendEmail({ to, subject, html, text });
};

export const sendPasswordResetEmail = async (to: string, name: string, token: string) => {
  const resetUrl = `${env.appBaseUrl.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const subject = "Reset your UmuravaLens password";
  const greetingName = getGreetingName(name);
  const html = `
    ${getBaseStyles()}
      <h2 style="margin:0 0 12px; color:#0f172a;">Password reset request</h2>
      <p style="margin:0 0 18px; color:#334155;">Hi ${greetingName}, we received a request to reset your password.</p>
      <a href="${resetUrl}" style="display:inline-block; background:#2563eb; color:#ffffff; text-decoration:none; padding:12px 18px; border-radius:8px; font-weight:600;">Reset Password</a>
      <p style="margin:18px 0 0; color:#475569;">If you did not request this, you can safely ignore this email.</p>
      <p style="margin:12px 0 8px; color:#475569;">Or copy this link:</p>
      <p style="margin:0; word-break:break-all;"><a href="${resetUrl}">${resetUrl}</a></p>
    ${getFooter()}
  `;
  const text = `Hi ${greetingName}, reset your UmuravaLens password using this link: ${resetUrl}`;

  return sendEmail({ to, subject, html, text });
};
