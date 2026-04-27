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
export const getUnderstandableMessage = (err: any): string => {
  const msg = err?.message || String(err);

  // Database connection issues
  if (msg.includes("ECONNREFUSED") && (msg.includes("27017") || msg.includes("mongo"))) {
    return "Unable to connect to mongo database";
  }

  // Microservice connection issues (Axios 1.x AggregateError or ECONNREFUSED)
  if (
    msg === "AggregateError" || 
    msg.includes("ECONNREFUSED") || 
    msg.includes("ENOTFOUND") || 
    msg.includes("ECONNRESET")
  ) {
    return "The requested service is currently unreachable. Please ensure all microservices are running.";
  }

  return msg;
};
