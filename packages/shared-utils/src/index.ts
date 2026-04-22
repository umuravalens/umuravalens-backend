import { ApiResponse } from "@umurava/shared-types";
import { createLogger, format, transports } from "winston";

export const logger = createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: format.combine(format.errors({ stack: true }), format.timestamp(), format.json()),
  transports: [new transports.Console()]
});

export class AppError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const ok = <T>(data: T): ApiResponse<T> => {
  return {
    success: true,
    data,
    error: null
  };
};

export const fail = (error: string): ApiResponse<null> => {
  return {
    success: false,
    data: null,
    error
  };
};
