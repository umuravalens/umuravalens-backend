import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { AppError } from "@umurava/shared-utils";
import { env } from "../config/env";
import { User } from "../models/User";
import { sendPasswordResetEmail, sendVerificationEmail } from "./emailService";

const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");
const randomToken = (): string => crypto.randomBytes(32).toString("hex");
const oauthClient = new OAuth2Client();
const DEFAULT_SOURCE = { name: env.defaultSourceName, code: env.defaultSourceCode, deletable: false };

const ensureDefaultSource = (user: any) => {
  if (!user.sources) user.sources = [];
  const hasDefault = user.sources.some((s: any) => s.code === DEFAULT_SOURCE.code);
  if (!hasDefault) {
    user.sources.push(DEFAULT_SOURCE);
  }
};

const signAccessToken = (userId: string, email: string) =>
  jwt.sign({ userId, email, type: "access" }, env.jwtSecret, { expiresIn: env.accessTokenExpiry as any });

const signRefreshToken = (userId: string, email: string, tokenVersion: number) =>
  jwt.sign({ userId, email, type: "refresh", tokenVersion }, env.jwtSecret, {
    expiresIn: env.refreshTokenExpiry as any
  });

export const login = async (email: string, password: string) => {
  const user = await User.findOne({ email });
  if (!user) {
    throw new AppError("Invalid credentials", 401);
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    throw new AppError("Invalid credentials", 401);
  }

  if (!user.emailVerified) {
    throw new AppError("Please verify your email before login", 403);
  }

  ensureDefaultSource(user);
  await user.save();

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id, user.email, user.refreshTokenVersion);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, firstname: user.firstname, lastname: user.lastname, email: user.email }
  };
};

export const loginOrRegisterWithGoogle = async (idToken: string) => {
  if (!env.googleClientId) {
    throw new AppError("Google auth is not configured", 500);
  }

  let ticket;
  try {
    ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: env.googleClientId
    });
  } catch {
    throw new AppError("Invalid Google token", 401);
  }

  const payload = ticket.getPayload();
  const email = String(payload?.email || "").toLowerCase();
  const googleId = String(payload?.sub || "");

  if (!email || !googleId) {
    throw new AppError("Invalid Google token payload", 400);
  }

  let user = await User.findOne({ email });

  if (!user) {
    throw new AppError("User not found. Registration is disabled.", 404);
  }

  if (user.googleId && user.googleId !== googleId) {
    throw new AppError("This email is linked to another Google account", 409);
  }
  
  user.googleId = googleId;
  user.emailVerified = true;
  ensureDefaultSource(user);
  await user.save();

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id, user.email, user.refreshTokenVersion);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, firstname: user.firstname, lastname: user.lastname, email: user.email }
  };
};

export const refreshToken = async (token: string) => {
  let payload: { userId: string; email: string; type: string; tokenVersion: number };

  try {
    payload = jwt.verify(token, env.jwtSecret) as any;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  if (payload.type !== "refresh") {
    throw new AppError("Invalid token type", 401);
  }

  const user = await User.findById(payload.userId);
  if (!user || user.refreshTokenVersion !== payload.tokenVersion) {
    throw new AppError("Refresh token revoked", 401);
  }

  const accessToken = signAccessToken(user.id, user.email);
  const newRefreshToken = signRefreshToken(user.id, user.email, user.refreshTokenVersion);

  return { accessToken, refreshToken: newRefreshToken };
};

export const logout = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  user.refreshTokenVersion += 1;
  await user.save();

  return { loggedOut: true };
};

export const logoutAll = async (userId: string) => logout(userId);

export const forgotPassword = async (email: string) => {
  const user = await User.findOne({ email });

  // Do not leak account existence
  if (!user) {
    return { sent: true };
  }

  const resetToken = randomToken();
  user.resetPasswordTokenHash = hashToken(resetToken);
  user.resetPasswordExpiresAt = new Date(Date.now() + env.resetTokenExpiryMinutes * 60 * 1000);
  await user.save();
  await sendPasswordResetEmail(user.email, `${user.firstname} ${user.lastname}`, resetToken);

  return { sent: true };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const tokenHash = hashToken(token);
  const user = await User.findOne({
    resetPasswordTokenHash: tokenHash,
    resetPasswordExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.resetPasswordTokenHash = undefined;
  user.resetPasswordExpiresAt = undefined;
  user.refreshTokenVersion += 1;
  await user.save();

  return { reset: true };
};

export const getProfile = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  return {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    emailVerified: user.emailVerified,
    sources: user.sources,
    createdAt: user.createdAt
  };
};

export const resendVerification = async (email: string) => {
  const user = await User.findOne({ email });

  // Keep the same response for unknown users to avoid account enumeration.
  if (!user) {
    return { sent: true };
  }

  if (user.emailVerified) {
    return { sent: true, alreadyVerified: true };
  }

  const verificationToken = randomToken();
  user.emailVerificationTokenHash = hashToken(verificationToken);
  await user.save();
  await sendVerificationEmail(user.email, `${user.firstname} ${user.lastname}`, verificationToken);

  return { sent: true };
};

export const updateProfile = async (userId: string, payload: { firstname?: string; lastname?: string; email?: string }) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  let emailChanged = false;

  if (typeof payload.firstname === "string") {
    user.firstname = payload.firstname.trim() || user.firstname;
  }
  if (typeof payload.lastname === "string") {
    user.lastname = payload.lastname.trim() || user.lastname;
  }

  if (typeof payload.email === "string") {
    const nextEmail = payload.email.trim().toLowerCase();
    if (!nextEmail) {
      throw new AppError("email cannot be empty", 400);
    }

    if (nextEmail !== user.email) {
      const existingUser = await User.findOne({ email: nextEmail });
      if (existingUser && existingUser.id !== user.id) {
        throw new AppError("Email already in use", 409);
      }
      user.email = nextEmail;
      user.emailVerified = false;
      const verificationToken = randomToken();
      user.emailVerificationTokenHash = hashToken(verificationToken);
      await sendVerificationEmail(user.email, `${user.firstname} ${user.lastname}`, verificationToken);
      emailChanged = true;
    }
  }

  await user.save();

  return {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    email: user.email,
    emailVerified: user.emailVerified,
    emailChanged
  };
};

export const changePassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isValid) {
    throw new AppError("Current password is incorrect", 400);
  }

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.refreshTokenVersion += 1;
  await user.save();

  return { changed: true };
};
