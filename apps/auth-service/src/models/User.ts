import { Schema, model } from "mongoose";

export interface UserDocument {
  name: string;
  email: string;
  passwordHash: string;
  googleId?: string;
  emailVerified: boolean;
  emailVerificationTokenHash?: string;
  resetPasswordTokenHash?: string;
  resetPasswordExpiresAt?: Date;
  refreshTokenVersion: number;
  createdAt?: Date;
}

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    googleId: { type: String, index: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String },
    resetPasswordTokenHash: { type: String },
    resetPasswordExpiresAt: { type: Date },
    refreshTokenVersion: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const User = model<UserDocument>("User", userSchema);
