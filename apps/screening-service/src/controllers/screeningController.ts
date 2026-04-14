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

export const runScreening = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const { jobId } = req.body;
    if (!jobId) {
      throw new AppError("jobId is required", 400);
    }

    const screening = await Screening.create({ jobId, createdBy: recruiterId, status: "pending", results: [] });
    await screeningQueue.add("run-screening", { screeningId: screening.id, jobId });

    res.status(202).json(ok(screening));
  } catch (error) {
    next(error);
  }
};

export const listScreenings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const query: any = { createdBy: recruiterId };
    if (req.query.jobId) query.jobId = String(req.query.jobId);
    if (req.query.status) query.status = String(req.query.status);

    const screenings = await Screening.find(query).sort({ createdAt: -1 });
    res.json(ok(screenings));
  } catch (error) {
    next(error);
  }
};

export const getScreeningStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const screening = await Screening.findOne({ _id: req.params.id, createdBy: recruiterId });
    if (!screening) {
      throw new AppError("Screening not found", 404);
    }
    res.json(ok({ id: screening.id, jobId: screening.jobId, status: screening.status }));
  } catch (error) {
    next(error);
  }
};

export const getScreeningResults = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getUserId(req);
    const screening = await Screening.findOne({ _id: req.params.id, createdBy: recruiterId });
    if (!screening) {
      throw new AppError("Screening not found", 404);
    }
    res.json(ok({ id: screening.id, jobId: screening.jobId, status: screening.status, results: screening.results }));
  } catch (error) {
    next(error);
  }
};
