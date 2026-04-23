import { NextFunction, Request, Response } from "express";
import { AppError, ok } from "@umurava/shared-utils";
import { Job } from "../models/Job";
import { env } from "../config/env";

const getUserId = (req: Request): string => {
  const userId = String(req.headers["x-user-id"] || "");
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }
  return userId;
};

const getPagination = (req: Request) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

const validateRequirements = (requirements: any) => {
  if (!requirements) {
    throw new AppError("requirements are required", 400);
  }

  const skills = Array.isArray(requirements.skills)
    ? requirements.skills.map((skill: string) => String(skill).trim()).filter(Boolean)
    : [];

  if (!skills.length) {
    throw new AppError("requirements.skills must contain at least one skill", 400);
  }

  const experienceYears = Number(requirements.experienceYears);
  if (Number.isNaN(experienceYears) || experienceYears < 0) {
    throw new AppError("requirements.experienceYears must be a positive number or zero", 400);
  }

  const location = String(requirements.location || "").trim();
  if (!location) {
    throw new AppError("requirements.location is required", 400);
  }

  return { skills, experienceYears, location };
};

export const createJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const {
      title,
      description,
      sources,
      requirements,
      status,
      threshold,
      shortlist,
      requiredDocuments
    } = req.body;

    if (!title || !description) {
      throw new AppError("title and description are required", 400);
    }

    const normalizedRequirements = validateRequirements(requirements);

    const jobSources = Array.isArray(sources) ? sources : [];
    const hasDefault = jobSources.some(s => s.code === env.defaultSourceCode);
    if (!hasDefault) {
      jobSources.push({ name: env.defaultSourceName, code: env.defaultSourceCode, applicantCount: 0 });
    }

    const job = await Job.create({
      recruiterId,
      title,
      description,
      sources: jobSources,
      requirements: normalizedRequirements,
      status: status || "draft",
      threshold: Number(threshold) || 0,
      shortlist: Number(shortlist) || 0,
      requiredDocuments: Array.isArray(requiredDocuments) ? requiredDocuments : []
    });

    res.status(201).json(ok({ ...job.toObject(), publicUrl: `/public/jobs/${job.publicId}` }));
  } catch (error) {
    next(error);
  }
};

export const listJobs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const { page, limit, skip } = getPagination(req);
    const query: any = { recruiterId };
    if (req.query.status) {
      query.status = String(req.query.status);
    }
    const [jobs, total] = await Promise.all([
      Job.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(query)
    ]);
    res.json(
      ok({
        items: jobs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getJobById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const job = await Job.findOne({ _id: req.params.id, recruiterId });
    if (!job) {
      throw new AppError("Job not found", 404);
    }
    res.json(ok(job));
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const payload = { ...req.body };
    if (payload.requirements) {
      payload.requirements = validateRequirements(payload.requirements);
    }

    if (payload.sources && Array.isArray(payload.sources)) {
      const hasDefault = payload.sources.some((s: any) => s.code === env.defaultSourceCode);
      if (!hasDefault) {
        payload.sources.push({ name: env.defaultSourceName, code: env.defaultSourceCode, applicantCount: 0 });
      }
    }

    const job = await Job.findOneAndUpdate({ _id: req.params.id, recruiterId }, payload, {
      new: true,
      runValidators: true
    });
    if (!job) {
      throw new AppError("Job not found", 404);
    }
    res.json(ok(job));
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const job = await Job.findOneAndDelete({ _id: req.params.id, recruiterId });
    if (!job) {
      throw new AppError("Job not found", 404);
    }
    res.json(ok({ deleted: true }));
  } catch (error) {
    next(error);
  }
};

export const publishJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const job = await Job.findOneAndUpdate(
      { _id: req.params.id, recruiterId },
      { status: "published" },
      { new: true, runValidators: true }
    );
    if (!job) {
      throw new AppError("Job not found", 404);
    }
    res.json(ok({ ...job.toObject(), publicUrl: `/public/jobs/${job.publicId}` }));
  } catch (error) {
    next(error);
  }
};

export const getPublicJobByPublicId = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { publicId, sourceCode } = req.params;
    const effectiveSource = sourceCode || env.defaultSourceCode;

    const job = await Job.findOne({ publicId, status: "published" });
    if (!job) {
      throw new AppError("Public job not found", 404);
    }

    const hasSource = job.sources.some(s => s.code === String(effectiveSource));
    if (!hasSource) {
      throw new AppError("This job is not available for the specified source", 403);
    }

    res.json(
      ok({
        id: job.id,
        recruiterId: job.recruiterId,
        publicId: job.publicId,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        status: job.status,
        requiredDocuments: job.requiredDocuments,
        activeSource: effectiveSource
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getJobInternalById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      throw new AppError("Job not found", 404);
    }
    res.json(ok(job));
  } catch (error) {
    next(error);
  }
};

export const updateJobMetrics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // "increment" | "decrement"

    const inc = action === "increment" ? 1 : -1;
    const job = await Job.findByIdAndUpdate(
      id,
      { $inc: { unverifiedFilesCount: inc } },
      { new: true }
    );

    if (!job) {
      throw new AppError("Job not found", 404);
    }

    // Ensure count doesn't go below zero
    if (job.unverifiedFilesCount < 0) {
        job.unverifiedFilesCount = 0;
        await job.save();
    }

    res.json(ok(job));
  } catch (error) {
    next(error);
  }
};
