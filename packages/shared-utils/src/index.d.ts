import { ApiResponse } from "@umurava/shared-types";
export declare const logger: import("winston").Logger;
export declare class AppError extends Error {
    readonly statusCode: number;
    constructor(message: string, statusCode?: number);
}
export declare const ok: <T>(data: T) => ApiResponse<T>;
export declare const fail: (error: string) => ApiResponse<null>;
export declare const getUnderstandableMessage: (err: any) => string;
