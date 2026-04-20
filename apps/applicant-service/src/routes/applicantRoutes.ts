import { Router } from "express";
import {
  addApplicant,
  createPublicApplicantWithFiles,
  deleteApplicant,
  getApplicantById,
  listApplicants,
  listApplicantsByJobInternal,
  listApplicantsByJob,
  updateApplicant
} from "../controllers/applicantController";
import { upload } from "../utils/upload";

const router = Router();

router.post("/public/jobs/:publicId/apply", upload.array("files", 20), createPublicApplicantWithFiles);
router.get("/applicants/internal/:jobId", listApplicantsByJobInternal);
router.post("/applicants", addApplicant);
router.get("/applicants", listApplicants);
router.get("/applicants/:jobId", listApplicantsByJob);
router.get("/applicant-items/:id", getApplicantById);
router.patch("/applicant-items/:id", updateApplicant);
router.delete("/applicant-items/:id", deleteApplicant);
export default router;
