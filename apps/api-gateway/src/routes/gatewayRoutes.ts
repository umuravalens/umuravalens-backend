import multer from "multer";
import { Router } from "express";
import {
  getDashboardOverview,
  getPublicJobDetails,
  proxyApplicantUploads,
  proxyToApplicants,
  proxyToIdentity,
  proxyToJobs,
  proxyToScreenings,
  submitPublicApplication
} from "../controllers/gatewayController";
import { authenticate } from "../middlewares/auth";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use("/uploads", proxyApplicantUploads);

/** No `authenticate` middleware — candidates and anonymous browsers must access these without JWT. */
router.get("/public/jobs/:publicId", getPublicJobDetails);
router.post("/public/jobs/:publicId/apply", upload.array("files", 20), submitPublicApplication);

router.post("/identity/login", proxyToIdentity);
router.post("/identity/google", proxyToIdentity);
router.post("/identity/refresh-token", proxyToIdentity);
router.post("/identity/forgot-password", proxyToIdentity);
router.post("/identity/reset-password", proxyToIdentity);
router.get("/identity/me", authenticate, proxyToIdentity);
router.patch("/identity/me", authenticate, proxyToIdentity);
router.patch("/identity/change-password", authenticate, proxyToIdentity);
router.post("/identity/logout", authenticate, proxyToIdentity);
router.post("/identity/logout-all", authenticate, proxyToIdentity);

router.get("/sources", authenticate, proxyToIdentity);
router.post("/sources", authenticate, proxyToIdentity);
router.put("/sources/:oldCode", authenticate, proxyToIdentity);
router.delete("/sources/:code", authenticate, proxyToIdentity);

router.get("/jobs", authenticate, proxyToJobs);
router.get("/jobs/:id", authenticate, proxyToJobs);
router.post("/jobs", authenticate, proxyToJobs);
router.post("/jobs/:id/publish", authenticate, proxyToJobs);
router.patch("/jobs/:id", authenticate, proxyToJobs);
router.delete("/jobs/:id", authenticate, proxyToJobs);

router.post("/applicants", authenticate, proxyToApplicants);
router.get("/applicants", authenticate, proxyToApplicants);
router.get("/applicants/:jobId", authenticate, proxyToApplicants);
router.get("/applicant-items/:id", authenticate, proxyToApplicants);
router.patch("/applicant-items/:id", authenticate, proxyToApplicants);
router.delete("/applicant-items/:id", authenticate, proxyToApplicants);

router.post("/screenings/run", authenticate, proxyToScreenings);
router.get("/screenings", authenticate, proxyToScreenings);
router.get("/screenings/:id/status", authenticate, proxyToScreenings);
router.get("/screenings/:id/results", authenticate, proxyToScreenings);

router.get("/dashboard/overview", authenticate, getDashboardOverview);

export default router;
