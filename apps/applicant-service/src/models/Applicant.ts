import { Schema, model } from "mongoose";

export interface ApplicantDocumentAttachment {
  documentName: string;
  originalFileName: string;
  storedFileName: string;
  uploadDate: Date;
  fileUrl: string;
  isAdditional: boolean;
  isVerified: boolean;
  sendToAI: boolean;
}

export interface ApplicantProfileData {
  basicInfo: {
    firstName: string;
    lastName: string;
    headline: string;
    bio: string;
    location: string;
  };
  skills: {
    name: string;
    level: "Beginner" | "Intermediate" | "Advanced" | "Expert";
    yearsOfExperience: number;
  }[];
  languages: {
    name: string;
    proficiency: "Basic" | "Conversational" | "Fluent" | "Native";
  }[];
  experience: {
    company: string;
    role: string;
    startDate: string;
    endDate: string;
    description: string;
    technologies: string[];
    isCurrent: boolean;
  }[];
  education: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    startYear: number;
    endYear: number;
  }[];
  certifications: {
    name: string;
    issuer: string;
    issueDate: string;
  }[];
  projects: {
    name: string;
    description: string;
    technologies: string[];
    role: string;
    link: string;
    startDate: string;
    endDate: string;
  }[];
  availability: {
    status: "Available" | "Open to Opportunities" | "Not Available";
    type: "Full-time" | "Part-time" | "Contract";
    startDate: string;
  };
  socialLinks: Record<string, string>;
}

export interface ApplicantDocument {
  jobId: string;
  source: "platform" | "upload";
  application_source: string;
  status: "draft" | "pending" | "shortlisted" | "rejected";
  name: string;
  email: string;
  phoneNumber: string;
  profileData: ApplicantProfileData;
  resumeUrl: string;
  documents: ApplicantDocumentAttachment[];
  aiAnalysis?: {
    matchScore: number;
    explanation: {
      strengths: string[];
      gaps: string[];
      recommendation: string;
    };
    rank: number;
  };
  createdAt?: Date;
}

const applicantSchema = new Schema<ApplicantDocument>(
  {
    jobId: { type: String, required: true, index: true },
    source: { type: String, enum: ["platform", "upload"], required: true },
    application_source: { type: String, required: true },
    status: {
      type: String,
      enum: ["draft", "pending", "shortlisted", "rejected"],
      default: "draft"
    },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phoneNumber: { type: String },
    profileData: {
      basicInfo: {
        firstName: String,
        lastName: String,
        headline: String,
        bio: String,
        location: String
      },
      skills: [{
        name: String,
        level: { type: String, enum: ["Beginner", "Intermediate", "Advanced", "Expert"] },
        yearsOfExperience: Number
      }],
      languages: [{
        name: String,
        proficiency: { type: String, enum: ["Basic", "Conversational", "Fluent", "Native"] }
      }],
      experience: [{
        company: String,
        role: String,
        startDate: String,
        endDate: String,
        description: String,
        technologies: [String],
        isCurrent: Boolean
      }],
      education: [{
        institution: String,
        degree: String,
        fieldOfStudy: String,
        startYear: Number,
        endYear: Number
      }],
      certifications: [{
        name: String,
        issuer: String,
        issueDate: String
      }],
      projects: [{
        name: String,
        description: String,
        technologies: [String],
        role: String,
        link: String,
        startDate: String,
        endDate: String
      }],
      availability: {
        status: { type: String, enum: ["Available", "Open to Opportunities", "Not Available"] },
        type: { type: String, enum: ["Full-time", "Part-time", "Contract"] },
        startDate: String
      },
      socialLinks: { type: Map, of: String }
    },
    resumeUrl: { type: String },
    documents: [
      {
        documentName: { type: String, required: true },
        originalFileName: { type: String, required: true },
        storedFileName: { type: String, required: true },
        uploadDate: { type: Date, default: Date.now },
        fileUrl: { type: String, required: true },
        isAdditional: { type: Boolean, default: false },
        isVerified: { type: Boolean, default: false },
        sendToAI: { type: Boolean, default: false }
      }
    ],
    aiAnalysis: {
      matchScore: Number,
      explanation: {
        strengths: [String],
        gaps: [String],
        recommendation: String
      },
      rank: Number
    }
  },
  { timestamps: true }
);

export const Applicant = model<ApplicantDocument>("Applicant", applicantSchema);
