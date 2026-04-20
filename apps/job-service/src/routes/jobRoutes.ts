import { Router } from "express";
import {
  createJob,
  deleteJob,
  getJobById,
  getJobInternalById,
  getPublicJobByPublicId,
  listJobs,
  publishJob,
  updateJob
} from "../controllers/jobController";

const router = Router();

router.get("/jobs/public/:publicId", getPublicJobByPublicId);
router.get("/jobs/internal/:id", getJobInternalById);
router.post("/jobs", createJob);
router.get("/jobs", listJobs);
router.post("/jobs/:id/publish", publishJob);
router.get("/jobs/:id", getJobById);
router.patch("/jobs/:id", updateJob);
router.delete("/jobs/:id", deleteJob);

export default router;
