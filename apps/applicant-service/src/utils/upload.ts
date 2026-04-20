import fs from "fs";
import path from "path";
import multer from "multer";
import { env } from "../config/env";

const dir = path.resolve(env.uploadDir);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, dir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${file.originalname.replace(/[^\w.\-]+/g, "_")}`)
});

export const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }
});
