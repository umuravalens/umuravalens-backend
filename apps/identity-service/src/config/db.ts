import mongoose from "mongoose";
import { logger } from "@umurava/shared-utils";

export const connectDb = async (uri: string): Promise<void> => {
  await mongoose.connect(uri);
  logger.info({ message: "Auth service connected to MongoDB" });
};
