import fs from "fs";
import path from "path";
import Papa from "papaparse";
import { NextFunction, Request, Response } from "express";
import { AppError, ok } from "@umurava/shared-utils";
import { Applicant } from "../models/Applicant";

const parseSkills = (skills: unknown): string[] => {
  const parsed = Array.isArray(skills)
    ? skills.map((s) => String(s).trim())
    : String(skills || "").split(",").map((s) => s.trim());

  return parsed.filter(Boolean);
};

const getRecruiterId = (req: Request): string => {
  const userId = String(req.headers["x-user-id"] || "");
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }
  return userId;
};

export const addApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const { jobId, name, email, skills, experienceYears, resumeUrl } = req.body;
    if (!jobId || !name || !email || !skills || experienceYears === undefined) {
      throw new AppError("jobId, name, email, skills and experienceYears are required", 400);
    }

    const applicant = await Applicant.create({
      jobId,
      name,
      email,
      skills: parseSkills(skills),
      experienceYears: Number(experienceYears),
      resumeUrl,
      createdBy: recruiterId,
      source: "recruiter"
    });

    res.status(201).json(ok(applicant));
  } catch (error) {
    next(error);
  }
};

export const createPublicApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, recruiterId, name, email, skills, experienceYears, resumeUrl } = req.body;
    if (!jobId || !recruiterId || !name || !email || !skills || experienceYears === undefined) {
      throw new AppError("jobId, recruiterId, name, email, skills and experienceYears are required", 400);
    }

    const applicant = await Applicant.create({
      jobId,
      name,
      email,
      skills: parseSkills(skills),
      experienceYears: Number(experienceYears),
      resumeUrl,
      createdBy: recruiterId,
      source: "public"
    });

    res.status(201).json(ok(applicant));
  } catch (error) {
    next(error);
  }
};

export const uploadCsv = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    if (!req.file) {
      throw new AppError("CSV file is required", 400);
    }

    const content = fs.readFileSync(req.file.path, "utf8");
    const parsed = Papa.parse<Record<string, string>>(content, { header: true, skipEmptyLines: true });

    const applicants = parsed.data
      .filter((row) => row.jobId && row.name && row.email)
      .map((row) => ({
        jobId: row.jobId,
        name: row.name,
        email: row.email,
        skills: parseSkills(row.skills || ""),
        experienceYears: Number(row.experienceYears || 0),
        resumeUrl: row.resumeUrl || "",
        createdBy: recruiterId,
        source: "recruiter" as const
      }));

    const created = await Applicant.insertMany(applicants, { ordered: false });
    res.status(201).json(ok({ inserted: created.length }));
  } catch (error) {
    next(error);
  }
};

export const uploadPdf = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new AppError("PDF file is required", 400);
    }

    const resumeUrl = path.resolve(req.file.path);
    res.status(201).json(ok({ resumeUrl }));
  } catch (error) {
    next(error);
  }
};

export const listApplicants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const query: any = { createdBy: recruiterId };
    if (req.query.jobId) {
      query.jobId = String(req.query.jobId);
    }

    const applicants = await Applicant.find(query).sort({ createdAt: -1 });
    res.json(ok(applicants));
  } catch (error) {
    next(error);
  }
};

export const listApplicantsByJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const applicants = await Applicant.find({ jobId: req.params.jobId, createdBy: recruiterId }).sort({ createdAt: -1 });
    res.json(ok(applicants));
  } catch (error) {
    next(error);
  }
};

export const listApplicantsByJobInternal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const applicants = await Applicant.find({ jobId: req.params.jobId }).sort({ createdAt: -1 });
    res.json(ok(applicants));
  } catch (error) {
    next(error);
  }
};

export const getApplicantById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const applicant = await Applicant.findOne({ _id: req.params.id, createdBy: recruiterId });
    if (!applicant) {
      throw new AppError("Applicant not found", 404);
    }
    res.json(ok(applicant));
  } catch (error) {
    next(error);
  }
};

export const updateApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const payload = { ...req.body };
    if (payload.skills !== undefined) {
      payload.skills = parseSkills(payload.skills);
    }

    const applicant = await Applicant.findOneAndUpdate(
      { _id: req.params.id, createdBy: recruiterId },
      payload,
      { new: true, runValidators: true }
    );
    if (!applicant) {
      throw new AppError("Applicant not found", 404);
    }

    res.json(ok(applicant));
  } catch (error) {
    next(error);
  }
};

export const deleteApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const applicant = await Applicant.findOneAndDelete({ _id: req.params.id, createdBy: recruiterId });
    if (!applicant) {
      throw new AppError("Applicant not found", 404);
    }
    res.json(ok({ deleted: true }));
  } catch (error) {
    next(error);
  }
};
