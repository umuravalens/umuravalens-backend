import { Schema, model } from "mongoose";
import crypto from "crypto";

export interface JobSource {
  name: string;
  code: string;
  applicantCount: number;
}

export interface RequiredDocument {
  documentType: string;
  isRequired: boolean;
  sendToAI: boolean;
}

export interface JobDocument {
  recruiterId: string;
  title: string;
  description: string;
  sources: JobSource[];
  requirements: {
    skills: string[];
    experienceYears: number;
    location: string;
  };
  status: "draft" | "published" | "closed" | "archived";
  shortlist: number;
  requiredDocuments: RequiredDocument[];
  unverifiedFilesCount: number;
  publicId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const jobSchema = new Schema<JobDocument>(
  {
    recruiterId: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    sources: [
      {
        name: { type: String, required: true },
        code: { type: String, required: true },
        applicantCount: { type: Number, default: 0 }
      }
    ],
    requirements: {
      skills: { type: [String], required: true },
      experienceYears: { type: Number, required: true, min: 0 },
      location: { type: String, required: true }
    },
    status: { 
      type: String, 
      enum: ["draft", "published", "closed", "archived"], 
      default: "draft" 
    },
    shortlist: { type: Number, default: 0 },
    requiredDocuments: [
      {
        documentType: { type: String, required: true },
        isRequired: { type: Boolean, default: false },
        sendToAI: { type: Boolean, default: false }
      }
    ],
    unverifiedFilesCount: { type: Number, default: 0 },
    publicId: { type: String, unique: true, index: true }
  },
  { timestamps: true }
);

jobSchema.pre("validate", function (next) {
  if (!this.publicId) {
    this.publicId = crypto.randomBytes(12).toString("hex");
  }
  next();
});

export const Job = model<JobDocument>("Job", jobSchema);
