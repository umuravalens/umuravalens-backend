import { Router } from "express";
import {
  getSources,
  createSource,
  updateSource,
  deleteSource
} from "../controllers/sourceController";
import { authenticate } from "../middlewares/auth";

const router = Router();

// All source routes require authentication
router.get("/sources", authenticate, getSources);
router.post("/sources", authenticate, createSource);
router.put("/sources/:oldCode", authenticate, updateSource);
router.delete("/sources/:code", authenticate, deleteSource);

export default router;
