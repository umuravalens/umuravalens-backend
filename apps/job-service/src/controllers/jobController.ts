import { NextFunction, Request, Response } from "express";
import { AppError, ok } from "@umurava/shared-utils";
import { Job } from "../models/Job";

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

  const experience = Number(requirements.experience);
  if (Number.isNaN(experience) || experience < 0) {
    throw new AppError("requirements.experience must be a positive number or zero", 400);
  }

  return { skills, experience };
};

export const createJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const { title, description, department, requirements, location, employmentType, status } = req.body;
    if (!title || !description) {
      throw new AppError("title and description are required", 400);
    }

    const normalizedRequirements = validateRequirements(requirements);

    const job = await Job.create({
      title,
      description,
      department: typeof department === "string" ? department.trim() : undefined,
      requirements: normalizedRequirements,
      location,
      employmentType,
      status,
      createdBy: recruiterId
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
    const query: any = { createdBy: recruiterId };
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
    const job = await Job.findOne({ _id: req.params.id, createdBy: recruiterId });
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

    const job = await Job.findOneAndUpdate({ _id: req.params.id, createdBy: recruiterId }, payload, {
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
    const job = await Job.findOneAndDelete({ _id: req.params.id, createdBy: recruiterId });
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
      { _id: req.params.id, createdBy: recruiterId },
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
    const job = await Job.findOne({ publicId: req.params.publicId, status: "published" });
    if (!job) {
      throw new AppError("Public job not found", 404);
    }

    res.json(
      ok({
        id: job.id,
        createdBy: job.createdBy,
        publicId: job.publicId,
        title: job.title,
        description: job.description,
        department: job.department,
        requirements: job.requirements,
        location: job.location,
        employmentType: job.employmentType,
        status: job.status
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
