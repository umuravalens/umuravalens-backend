import { NextFunction, Request, Response } from "express";
import { AppError, ok } from "@umurava/shared-utils";
import { Screening } from "../models/Screening";
import { screeningQueue } from "../services/queueService";

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

export const runScreening = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const { jobId } = req.body;
    if (!jobId) {
      throw new AppError("jobId is required", 400);
    }

    const screening = await Screening.create({ 
        jobId, 
        recruiterId, 
        status: "pending", 
        stats: { totalApplicants: 0, shortlistedCount: 0, topScore: 0 }
    });
    await screeningQueue.add("run-screening", { screeningId: screening.id, jobId });

    res.status(202).json(ok(screening));
  } catch (error) {
    next(error);
  }
};

export const listScreenings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const { page, limit, skip } = getPagination(req);
    const query: any = { recruiterId };
    if (req.query.jobId) query.jobId = String(req.query.jobId);
    if (req.query.status) query.status = String(req.query.status);

    const [screenings, total] = await Promise.all([
      Screening.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Screening.countDocuments(query)
    ]);
    res.json(
      ok({
        items: screenings,
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

export const getScreeningStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const screening = await Screening.findOne({ _id: req.params.id, recruiterId });
    if (!screening) {
      throw new AppError("Screening not found", 404);
    }
    res.json(ok({ id: screening.id, jobId: screening.jobId, status: screening.status, stats: screening.stats }));
  } catch (error) {
    next(error);
  }
};

export const getScreeningResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const screening = await Screening.findOne({ _id: req.params.id, recruiterId });
    if (!screening) {
      throw new AppError("Screening not found", 404);
    }
    res.json(ok({ 
        id: screening.id, 
        jobId: screening.jobId, 
        status: screening.status, 
        stats: screening.stats
    }));
  } catch (error) {
    next(error);
  }
};
