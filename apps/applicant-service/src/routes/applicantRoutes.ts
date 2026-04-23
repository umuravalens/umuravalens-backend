import { Router } from "express";
import {
  addApplicant,
  applyApplicant,
  verifyApplicant,
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

router.post("/analyze", upload.single("resume"), extractInfo);
router.post("/apply", upload.array("files", 10), applyApplicant);
router.post("/verify/:applicantId", upload.array("files", 10), verifyApplicant);

router.get("/applicants/internal/:jobId", listApplicantsByJobInternal);
router.patch("/applicants/internal/:id/ai", updateApplicantAIInternal);
router.post("/applicants", addApplicant);
router.get("/applicants", listApplicants);
router.get("/applicants/:jobId", listApplicantsByJob);
router.get("/applicant-items/:id", getApplicantById);
router.patch("/applicant-items/:id", updateApplicant);
router.patch("/applicant-items/:id/documents/:storedFileName/verify", verifyDocument);
router.delete("/applicant-items/:id", deleteApplicant);
export default router;
