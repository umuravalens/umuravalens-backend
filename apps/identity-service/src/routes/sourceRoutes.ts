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
router.use(authenticate);

router.get("/sources", getSources);
router.post("/sources", createSource);
router.put("/sources/:oldCode", updateSource);
router.delete("/sources/:code", deleteSource);

export default router;
