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
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/heic",
      "image/heif"
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, PNG, JPG, WebP, and HEIC/HEIF are allowed."));
    }
  }
});

router.use("/uploads", proxyApplicantUploads);

/** No `authenticate` middleware — candidates and anonymous browsers must access these without JWT. */
router.get("/jobs/public/:publicId/:sourceCode?", getPublicJobDetails);
router.post("/applicants/analyze", upload.any(), proxyToApplicants);
router.post("/applicants/apply", upload.any(), proxyToApplicants);
router.post("/applicants/verify/:applicantId", upload.any(), proxyToApplicants);

router.post("/auth/register", proxyToIdentity);
router.post("/auth/login", proxyToIdentity);
router.post("/auth/google", proxyToIdentity);
router.post("/auth/refresh-token", proxyToIdentity);
router.post("/auth/forgot-password", proxyToIdentity);
router.post("/auth/verify-email", proxyToIdentity);
router.post("/auth/resend-verification", proxyToIdentity);
router.post("/auth/reset-password", proxyToIdentity);
router.get("/auth/me", authenticate, proxyToIdentity);
router.patch("/auth/me", authenticate, proxyToIdentity);
router.patch("/auth/change-password", authenticate, proxyToIdentity);
router.post("/auth/logout", authenticate, proxyToIdentity);
router.post("/auth/logout-all", authenticate, proxyToIdentity);

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
