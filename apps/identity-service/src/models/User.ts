import { Schema, model } from "mongoose";

export interface UserSource {
  name: string;
  code: string;
}

export interface UserDocument {
  firstname: string;
  lastname: string;
  email: string;
  passwordHash: string;
  sources: UserSource[];
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
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    passwordHash: { type: String, required: true },
    sources: [
      {
        name: { type: String, required: true },
        code: { type: String, required: true }
      }
    ],
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
