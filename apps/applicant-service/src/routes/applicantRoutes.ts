import { Router } from "express";
import {
  addApplicant,
  applyApplicant,
  deleteApplicant,
  getApplicantById,
  listApplicants,
  listApplicantsByJobInternal,
  listApplicantsByJob,
  updateApplicant,
  updateApplicantAIInternal,
  verifyDocument
} from "../controllers/applicantController";
import { extractInfo } from "../controllers/extractInfoController";
import { upload } from "../utils/upload";

const router = Router();

router.post("/analyze", upload.any(), extractInfo);
router.post("/apply", upload.any(), applyApplicant);

router.get("/applicants/internal/:jobId", listApplicantsByJobInternal);
router.patch("/applicants/internal/:id/ai", updateApplicantAIInternal);
router.post("/", addApplicant);
router.get("/", listApplicants);
router.get("/:jobId", listApplicantsByJob);
router.get("/applicant-items/:id", getApplicantById);
router.patch("/applicant-items/:id", updateApplicant);
router.patch("/applicant-items/:id/documents/:storedFileName/verify", verifyDocument);
router.delete("/applicant-items/:id", deleteApplicant);
export default router;
