import multer from "multer";
import { Router } from "express";
import {
  getDashboardOverview,
  getPublicJobDetails,
  proxyToApplicants,
  proxyToAuth,
  proxyToJobs,
  proxyToScreenings,
  submitPublicApplication
} from "../controllers/gatewayController";
import { authenticate } from "../middlewares/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get("/public/jobs/:publicId", getPublicJobDetails);
router.post("/public/jobs/:publicId/apply", submitPublicApplication);

router.post("/auth/register", proxyToAuth);
router.get("/auth/verify-email", proxyToAuth);
router.post("/auth/login", proxyToAuth);
router.post("/auth/refresh-token", proxyToAuth);
router.post("/auth/forgot-password", proxyToAuth);
router.post("/auth/reset-password", proxyToAuth);
router.get("/auth/me", authenticate, proxyToAuth);
router.post("/auth/logout", authenticate, proxyToAuth);
router.post("/auth/logout-all", authenticate, proxyToAuth);

router.get("/jobs", authenticate, proxyToJobs);
router.get("/jobs/:id", authenticate, proxyToJobs);
router.post("/jobs", authenticate, proxyToJobs);
router.patch("/jobs/:id", authenticate, proxyToJobs);
router.delete("/jobs/:id", authenticate, proxyToJobs);

router.post("/applicants", authenticate, proxyToApplicants);
router.get("/applicants", authenticate, proxyToApplicants);
router.get("/applicants/:jobId", authenticate, proxyToApplicants);
router.get("/applicant-items/:id", authenticate, proxyToApplicants);
router.patch("/applicant-items/:id", authenticate, proxyToApplicants);
router.delete("/applicant-items/:id", authenticate, proxyToApplicants);
router.post("/applicants/upload-csv", authenticate, upload.single("file"), proxyToApplicants);
router.post("/applicants/upload-pdf", authenticate, upload.single("file"), proxyToApplicants);

router.post("/screenings/run", authenticate, proxyToScreenings);
router.get("/screenings", authenticate, proxyToScreenings);
router.get("/screenings/:id/status", authenticate, proxyToScreenings);
router.get("/screenings/:id/results", authenticate, proxyToScreenings);

router.get("/dashboard/overview", authenticate, getDashboardOverview);

export default router;
