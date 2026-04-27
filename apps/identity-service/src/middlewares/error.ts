import { NextFunction, Request, Response } from "express";
import { AppError, fail, logger, getUnderstandableMessage } from "@umurava/shared-utils";

export const notFound = (_req: Request, _res: Response, next: NextFunction): void => {
  next(new AppError("Route not found", 404));
};

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = getUnderstandableMessage(err);
  logger.error({ message, stack: err.stack, statusCode });
  res.status(statusCode).json(fail(message || "Internal server error"));
};
