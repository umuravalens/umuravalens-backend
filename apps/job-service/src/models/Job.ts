import { Schema, model } from "mongoose";
import crypto from "crypto";

export interface JobDocument {
  title: string;
  description: string;
  requirements: {
    skills: string[];
    experience: number;
  };
  location?: string;
  employmentType?: string;
  status: "draft" | "published" | "closed";
  createdBy: string;
  publicId: string;
}

const jobSchema = new Schema<JobDocument>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    requirements: {
      skills: {
        type: [String],
        required: true,
        validate: {
          validator: (skills: string[]) => Array.isArray(skills) && skills.length > 0,
          message: "At least one required skill is needed"
        }
      },
      experience: { type: Number, required: true, min: 0 }
    },
    location: { type: String },
    employmentType: { type: String },
    status: { type: String, enum: ["draft", "published", "closed"], default: "published" },
    createdBy: { type: String, required: true, index: true },
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
