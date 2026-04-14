import { Schema, model } from "mongoose";

export interface ApplicantDocument {
  jobId: string;
  name: string;
  email: string;
  skills: string[];
  experienceYears: number;
  resumeUrl?: string;
  createdBy: string;
  source: "recruiter" | "public";
}

const applicantSchema = new Schema<ApplicantDocument>(
  {
    jobId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    skills: { type: [String], required: true },
    experienceYears: { type: Number, required: true },
    resumeUrl: { type: String },
    createdBy: { type: String, required: true, index: true },
    source: { type: String, enum: ["recruiter", "public"], default: "recruiter" }
  },
  { timestamps: true }
);

export const Applicant = model<ApplicantDocument>("Applicant", applicantSchema);
