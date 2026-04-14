import { Request, Response, NextFunction } from "express";
import { ok, AppError } from "@umurava/shared-utils";
import * as authService from "../services/authService";
import { AuthenticatedRequest } from "../middlewares/auth";

export const registerUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      throw new AppError("name, email and password are required", 400);
    }

    const data = await authService.register(name, email, password);
    res.status(201).json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = String(req.query.token || "");
    if (!token) {
      throw new AppError("token is required", 400);
    }
    const data = await authService.verifyEmail(token);
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      throw new AppError("email and password are required", 400);
    }

    const data = await authService.login(email, password);
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const refreshAccessToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      throw new AppError("refreshToken is required", 400);
    }

    const data = await authService.refreshToken(refreshToken);
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await authService.logout(userId);
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const logoutAll = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await authService.logoutAll(userId);
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError("email is required", 400);
    }
    const data = await authService.forgotPassword(email);
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      throw new AppError("token and newPassword are required", 400);
    }

    const data = await authService.resetPassword(token, newPassword);
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const me = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const data = await authService.getProfile(userId);
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};
