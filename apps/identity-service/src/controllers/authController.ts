import { Request, Response, NextFunction } from "express";
import { ok, AppError } from "@umurava/shared-utils";
import * as authService from "../services/authService";
import { AuthenticatedRequest } from "../middlewares/auth";

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

export const googleAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      throw new AppError("idToken is required", 400);
    }

    const data = await authService.loginOrRegisterWithGoogle(String(idToken));
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

export const resendVerification = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    if (!email) {
      throw new AppError("email is required", 400);
    }

    const data = await authService.resendVerification(String(email));
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const { firstname, lastname, email } = req.body;
    if (typeof firstname === "undefined" && typeof lastname === "undefined" && typeof email === "undefined") {
      throw new AppError("At least one field (firstname, lastname or email) is required", 400);
    }

    const data = await authService.updateProfile(userId, { firstname, lastname, email });
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      throw new AppError("Unauthorized", 401);
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      throw new AppError("currentPassword and newPassword are required", 400);
    }

    if (String(newPassword).length < 6) {
      throw new AppError("newPassword must be at least 6 characters", 400);
    }

    const data = await authService.changePassword(userId, String(currentPassword), String(newPassword));
    res.json(ok(data));
  } catch (error) {
    next(error);
  }
};
