"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fail = exports.ok = exports.AppError = exports.logger = void 0;
const winston_1 = require("winston");
exports.logger = (0, winston_1.createLogger)({
    level: process.env.LOG_LEVEL || "info",
    format: winston_1.format.combine(winston_1.format.errors({ stack: true }), winston_1.format.timestamp(), winston_1.format.json()),
    transports: [new winston_1.transports.Console()]
});
class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
const ok = (data) => {
    return {
        success: true,
        data,
        error: null
    };
};
exports.ok = ok;
const fail = (error) => {
    return {
        success: false,
        data: null,
        error
    };
};
exports.fail = fail;
