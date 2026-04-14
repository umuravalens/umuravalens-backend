import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "@umurava/shared-utils";
import { env } from "../config/env";

export const authenticate = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new AppError("Authorization header required", 401));
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string; email: string; type?: string };
    if (payload.type && payload.type !== "access") {
      throw new AppError("Invalid access token", 401);
    }
    req.headers["x-user-id"] = payload.userId;
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
};
