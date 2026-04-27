import { Router } from "express";
import {
  createJob,
  deleteJob,
  getJobById,
  getJobInternalById,
  getPublicJobByPublicId,
  listJobs,
  publishJob,
  updateJob,
  updateJobInternal,
  updateJobMetrics
} from "../controllers/jobController";

const router = Router();

router.get("/jobs/public/:publicId/:sourceCode?", getPublicJobByPublicId);
router.get("/jobs/internal/:id", getJobInternalById);
router.patch("/jobs/internal/:id", updateJobInternal);
router.patch("/jobs/internal/:id/metrics", updateJobMetrics);
router.post("/jobs", createJob);
router.get("/jobs", listJobs);
router.post("/jobs/:id/publish", publishJob);
router.get("/jobs/:id", getJobById);
router.patch("/jobs/:id", updateJob);
router.delete("/jobs/:id", deleteJob);

export default router;
