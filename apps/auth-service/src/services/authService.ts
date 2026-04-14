import bcrypt from "bcrypt";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { AppError } from "@umurava/shared-utils";
import { env } from "../config/env";
import { User } from "../models/User";

const hashToken = (token: string): string => crypto.createHash("sha256").update(token).digest("hex");
const randomToken = (): string => crypto.randomBytes(32).toString("hex");

const signAccessToken = (userId: string, email: string) =>
  jwt.sign({ userId, email, type: "access" }, env.jwtSecret, { expiresIn: env.accessTokenExpiry as any });

const signRefreshToken = (userId: string, email: string, tokenVersion: number) =>
  jwt.sign({ userId, email, type: "refresh", tokenVersion }, env.jwtSecret, {
    expiresIn: env.refreshTokenExpiry as any
  });

export const register = async (name: string, email: string, password: string) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError("Email already in use", 409);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const verificationToken = randomToken();

  const user = await User.create({
    name,
    email,
    passwordHash,
    emailVerificationTokenHash: hashToken(verificationToken),
    emailVerified: false
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    verificationToken,
    verificationHint: "Send verificationToken by email in production"
  };
};

export const verifyEmail = async (token: string) => {
  const tokenHash = hashToken(token);
  const user = await User.findOne({ emailVerificationTokenHash: tokenHash });

  if (!user) {
    throw new AppError("Invalid verification token", 400);
  }

  user.emailVerified = true;
  user.emailVerificationTokenHash = undefined;
  await user.save();

  return { verified: true };
};

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

  const accessToken = signAccessToken(user.id, user.email);
  const refreshToken = signRefreshToken(user.id, user.email, user.refreshTokenVersion);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email }
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

  return {
    sent: true,
    resetToken,
    resetHint: "Send resetToken by email in production"
  };
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
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt
  };
};
