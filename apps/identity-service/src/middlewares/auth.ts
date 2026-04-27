import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "@umurava/shared-utils";
import { env } from "../config/env";

export interface AuthenticatedRequest extends Request {
  user?: { userId: string; email: string };
}

export const authenticate = (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return next(new AppError("Authorization header required", 401));
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { userId: string; email: string; type: "access" | "refresh" };
    if (payload.type !== "access") {
      throw new AppError("Invalid access token", 401);
    }
    req.user = { userId: payload.userId, email: payload.email };
    next();
  } catch {
    next(new AppError("Invalid or expired token", 401));
  }
};
