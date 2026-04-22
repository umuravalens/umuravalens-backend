import { Schema, model } from "mongoose";
import { ScreeningStatus } from "@umurava/shared-types";

export interface ScreeningDocument {
  jobId: string;
  recruiterId: string;
  status: "pending" | "processing" | "completed" | "failed";
  stats: {
    totalApplicants: number;
    shortlistedCount: number;
    topScore: number;
  };
  error?: string;
  completedAt?: Date;
  createdAt?: Date;
}

const screeningSchema = new Schema<ScreeningDocument>(
  {
    jobId: { type: String, required: true, index: true },
    recruiterId: { type: String, required: true, index: true },
    status: { 
      type: String, 
      enum: ["pending", "processing", "completed", "failed"], 
      default: "pending" 
    },
    stats: {
      totalApplicants: { type: Number, default: 0 },
      shortlistedCount: { type: Number, default: 0 },
      topScore: { type: Number, default: 0 }
    },
    error: { type: String },
    completedAt: { type: Date }
  },
  { timestamps: true }
);

export const Screening = model<ScreeningDocument>("Screening", screeningSchema);
