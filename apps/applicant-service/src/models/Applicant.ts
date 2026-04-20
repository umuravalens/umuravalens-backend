import { Schema, model } from "mongoose";

export interface ApplicantDocumentAttachment {
  documentName: string;
  originalFileName: string;
  storedFileName: string;
}

export interface ApplicantDocument {
  jobId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phoneNumber?: string;
  skills: string[];
  experienceYears: number;
  resumeUrl?: string;
  documents?: ApplicantDocumentAttachment[];
  createdBy: string;
  source: "recruiter" | "public";
}

const applicantSchema = new Schema<ApplicantDocument>(
  {
    jobId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    email: { type: String, required: true },
    phoneNumber: { type: String, trim: true },
    skills: { type: [String], required: true },
    experienceYears: { type: Number, required: true },
    resumeUrl: { type: String },
    documents: [
      {
        documentName: { type: String, required: true, trim: true },
        originalFileName: { type: String, default: "" },
        storedFileName: { type: String, required: true }
      }
    ],
    createdBy: { type: String, required: true, index: true },
    source: { type: String, enum: ["recruiter", "public"], default: "recruiter" }
  },
  { timestamps: true }
);

export const Applicant = model<ApplicantDocument>("Applicant", applicantSchema);
