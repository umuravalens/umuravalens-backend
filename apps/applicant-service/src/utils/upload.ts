import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

import { logger } from "@umurava/shared-utils";

const dir = path.resolve(env.uploadDir);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const name = `${Date.now()}-${file.originalname.replace(/[^\w.\-]+/g, "_")}`;
    logger.info({ message: "Saving file to disk", filename: name, directory: dir });
    cb(null, name);
  }
});

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});
