import { Response, NextFunction } from "express";
import { User } from "../models/User";
import { AppError, ok } from "@umurava/shared-utils";
import { AuthenticatedRequest } from "../middlewares/auth";

const DEFAULT_SOURCE = { name: "Umurava", code: "umrv_plt" };

export const getSources = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError("Unauthorized", 401);

    let user = await User.findById(userId);
    
    if (!user) {
      throw new AppError("User not found", 404);
    }

    // Ensure default source exists
    if (!user.sources || user.sources.length === 0) {
      user.sources = [DEFAULT_SOURCE];
      await user.save();
    } else {
      const hasDefault = user.sources.some(s => s.code === DEFAULT_SOURCE.code);
      if (!hasDefault) {
        user.sources.push(DEFAULT_SOURCE);
        await user.save();
      }
    }

    res.json(ok(user.sources));
  } catch (error) {
    next(error);
  }
};

export const createSource = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError("Unauthorized", 401);

    const { name, code } = req.body;

    if (!name || !code) {
      throw new AppError("Name and code are required", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const exists = user.sources.some(s => s.code === code);
    if (exists) {
      throw new AppError("Source with this code already exists", 400);
    }

    user.sources.push({ name, code });
    await user.save();

    res.status(201).json(ok(user.sources));
  } catch (error) {
    next(error);
  }
};

export const updateSource = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError("Unauthorized", 401);

    const { oldCode } = req.params;
    const { name, code } = req.body;

    if (!name || !code) {
      throw new AppError("Name and code are required", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    const sourceIndex = user.sources.findIndex(s => s.code === oldCode);
    if (sourceIndex === -1) {
      throw new AppError("Source not found", 404);
    }

    user.sources[sourceIndex] = { name, code };
    await user.save();

    res.json(ok(user.sources));
  } catch (error) {
    next(error);
  }
};

export const deleteSource = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.userId;
    if (!userId) throw new AppError("Unauthorized", 401);

    const { code } = req.params;

    if (code === DEFAULT_SOURCE.code) {
      throw new AppError("Cannot delete the default source", 400);
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError("User not found", 404);
    }

    user.sources = user.sources.filter(s => s.code !== code);
    await user.save();

    res.json(ok(user.sources));
  } catch (error) {
    next(error);
  }
};
