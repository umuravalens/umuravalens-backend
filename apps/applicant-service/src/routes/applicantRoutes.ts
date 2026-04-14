import { Router } from "express";
import {
  addApplicant,
  createPublicApplicant,
  deleteApplicant,
  getApplicantById,
  listApplicants,
  listApplicantsByJobInternal,
  listApplicantsByJob,
  updateApplicant,
  uploadCsv,
  uploadPdf
} from "../controllers/applicantController";
import { upload } from "../utils/upload";

const router = Router();

router.post("/public/apply", createPublicApplicant);
router.get("/applicants/internal/:jobId", listApplicantsByJobInternal);
router.post("/applicants", addApplicant);
router.get("/applicants", listApplicants);
router.get("/applicants/:jobId", listApplicantsByJob);
router.get("/applicant-items/:id", getApplicantById);
router.patch("/applicant-items/:id", updateApplicant);
router.delete("/applicant-items/:id", deleteApplicant);
router.post("/applicants/upload-csv", upload.single("file"), uploadCsv);
router.post("/applicants/upload-pdf", upload.single("file"), uploadPdf);

export default router;
