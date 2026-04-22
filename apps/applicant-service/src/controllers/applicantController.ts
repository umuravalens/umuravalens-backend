import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { AppError, ok } from "@umurava/shared-utils";
import { env } from "../config/env";
import { Applicant, ApplicantDocumentAttachment } from "../models/Applicant";

/** Same origin as API gateway — use `new URL(doc.fileUrl, apiBase)` on the frontend if needed. */
const attachDocumentFileUrls = <T extends { documents?: ApplicantDocumentAttachment[] }>(row: T) => {
  if (!row.documents?.length) return { ...row };
  return {
    ...row,
    documents: row.documents.map((d) => ({
      ...d,
      fileUrl: `/uploads/${d.storedFileName}`
    }))
  };
};

const withApplicantId = (doc: { _id: { toString: () => string }; toObject: () => Record<string, unknown> }) =>
  attachDocumentFileUrls({
    ...doc.toObject(),
    applicantId: doc._id.toString()
  } as { documents?: ApplicantDocumentAttachment[]; applicantId: string } & Record<string, unknown>);

const serializeApplicant = (a: { toObject: () => Record<string, unknown>; _id: { toString: () => string } }) =>
  attachDocumentFileUrls({
    ...a.toObject(),
    applicantId: a._id.toString()
  } as { documents?: ApplicantDocumentAttachment[]; applicantId: string } & Record<string, unknown>);

const parseSkills = (skills: unknown): string[] => {
  const parsed = Array.isArray(skills)
    ? skills.map((s) => String(s).trim())
    : String(skills || "").split(",").map((s) => s.trim());

  return parsed.filter(Boolean);
};

const getRecruiterId = (req: Request): string => {
  const userId = String(req.headers["x-user-id"] || "");
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }
  return userId;
};

const normalizeDocuments = (raw: unknown): ApplicantDocumentAttachment[] => {
  if (!raw) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new AppError("documents must be an array", 400);
  }
  const out: ApplicantDocumentAttachment[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const doc = item as Record<string, unknown>;
    const documentName = String(doc.documentName || "").trim();
    const storedFileName = String(doc.storedFileName || "").trim();
    if (!documentName || !storedFileName) {
      throw new AppError("Each document needs documentName and storedFileName", 400);
    }
    out.push({
      documentName,
      storedFileName,
      originalFileName: doc.originalFileName ? String(doc.originalFileName) : "",
      uploadDate: doc.uploadDate ? new Date(String(doc.uploadDate)) : new Date(),
      fileUrl: doc.fileUrl ? String(doc.fileUrl) : `/uploads/${storedFileName}`
    });
  }
  return out;
};

const getPagination = (req: Request) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

export const addApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const { jobId, name, email, profileData, resumeUrl, application_source } = req.body;
    if (!jobId || !name || !email || !profileData || !application_source) {
      throw new AppError("jobId, name, email, profileData and application_source are required", 400);
    }

    const applicant = await Applicant.create({
      jobId,
      name,
      email,
      profileData,
      application_source,
      resumeUrl,
      documents: normalizeDocuments(req.body.documents),
      source: "platform",
      status: "pending"
    });

    res.status(201).json(ok(withApplicantId(applicant)));
  } catch (error) {
    next(error);
  }
};

export const applyApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { jobId, source_code, verifiedData, otherDocuments, resumeFile } = req.body;

    if (!jobId || !source_code || !verifiedData) {
      throw new AppError("jobId, source_code and verifiedData are required", 400);
    }

    // Verify Job and get required documents
    const jobRes = await axios.get(`${env.jobServiceUrl}/jobs/internal/${jobId}`, { validateStatus: () => true });
    if (jobRes.status !== 200 || !jobRes.data?.success || !jobRes.data?.data) {
      throw new AppError("Job not found", 404);
    }
    const job = jobRes.data.data;

    // Verify Source
    const sourceExists = job.sources.some((s: any) => s.code === source_code);
    if (!sourceExists) {
        throw new AppError("Invalid source code for this job", 400);
    }

    // Document Validation
    const requiredDocs = job.requiredDocuments || [];
    const providedDocNames = [
        ...(otherDocuments || []).map((d: any) => d.documentName),
        resumeFile?.documentName
    ].filter(Boolean);

    for (const reqDoc of requiredDocs) {
        if (reqDoc.isRequired && !providedDocNames.includes(reqDoc.documentType)) {
            throw new AppError(`Missing required document: ${reqDoc.documentType}`, 400);
        }
    }

    // Check if extra documents are allowed (if they match required types or we allow any)
    const validDocTypes = requiredDocs.map((rd: any) => rd.documentType);
    for (const docName of providedDocNames) {
        if (!validDocTypes.includes(docName)) {
            throw new AppError(`Document type ${docName} is not required/allowed for this job`, 400);
        }
    }

    const docList: ApplicantDocumentAttachment[] = (otherDocuments || []).map((d: any) => ({
        ...d,
        uploadDate: new Date(),
        fileUrl: `/uploads/${d.storedFileName}`
    }));

    if (resumeFile) {
        docList.push({
            ...resumeFile,
            uploadDate: new Date(),
            fileUrl: `/uploads/${resumeFile.storedFileName}`
        });
    }

    const resumeDoc = docList.find(d => d.documentName === 'Resume');
    const resumeUrl = resumeDoc ? resumeDoc.fileUrl : "";

    const applicant = await Applicant.create({
      jobId,
      source: "upload",
      application_source: source_code,
      status: "draft",
      name: verifiedData.name,
      email: verifiedData.email,
      profileData: verifiedData.profileData,
      resumeUrl: resumeUrl,
      documents: docList
    });

    res.status(201).json(ok(serializeApplicant(applicant)));
  } catch (error) {
    next(error);
  }
};

export const verifyApplicant = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { applicantId } = req.params;
        const updatedData = req.body;

        const applicant = await Applicant.findById(applicantId);
        if (!applicant) {
            throw new AppError("Applicant not found", 404);
        }

        if (applicant.status !== "draft") {
            throw new AppError("Only draft applications can be verified", 400);
        }

        // Check for changes - Simple comparison of email for now as per instructions "if the response comes as it was without any changes"
        // Instruction: "if the response comes as it was without any changes... change status to pending... if there is a change return the user with the draft response still"
        // We'll compare some key fields or the whole object.
        const isModified = JSON.stringify(updatedData.profileData) !== JSON.stringify(applicant.profileData);

        if (isModified) {
            // Update the draft and return it
            applicant.profileData = updatedData.profileData;
            applicant.name = updatedData.name;
            applicant.email = updatedData.email;
            await applicant.save();
            return res.json(ok(serializeApplicant(applicant)));
        }

        // No changes, proceed to pending
        // Check for existing application with same email and specific statuses
        const existing = await Applicant.findOne({
            email: applicant.email,
            status: { $in: ["pending", "shortlisted", "rejected"] },
            jobId: applicant.jobId
        });

        if (existing) {
            throw new AppError("An application with this email already exists for this job", 400);
        }

        applicant.status = "pending";
        await applicant.save();

        res.json(ok(serializeApplicant(applicant)));
    } catch (error) {
        next(error);
    }
};

export const listApplicants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const { page, limit, skip } = getPagination(req);
    const query: any = { status: { $ne: "draft" } }; // Typically recruiter only sees non-drafts
    if (req.query.jobId) {
      query.jobId = String(req.query.jobId);
    }

    const [applicants, total] = await Promise.all([
      Applicant.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Applicant.countDocuments(query)
    ]);
    res.json(
      ok({
        items: applicants.map((a) => serializeApplicant(a)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

export const listApplicantsByJob = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const { page, limit, skip } = getPagination(req);
    const query = { jobId: req.params.jobId, createdBy: recruiterId };
    const [applicants, total] = await Promise.all([
      Applicant.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Applicant.countDocuments(query)
    ]);
    res.json(
      ok({
        items: applicants.map((a) => serializeApplicant(a)),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

export const listApplicantsByJobInternal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit, skip } = getPagination(req);
    const query = { jobId: req.params.jobId };
    const [applicants, total] = await Promise.all([
      Applicant.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Applicant.countDocuments(query)
    ]);
    res.json(
      ok({
        items: applicants,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })
    );
  } catch (error) {
    next(error);
  }
};

export const getApplicantById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const applicant = await Applicant.findOne({ _id: req.params.id, createdBy: recruiterId });
    if (!applicant) {
      throw new AppError("Applicant not found", 404);
    }
    res.json(ok(serializeApplicant(applicant)));
  } catch (error) {
    next(error);
  }
};

export const updateApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const payload = { ...req.body };
    if (payload.skills !== undefined) {
      payload.skills = parseSkills(payload.skills);
    }
    if (payload.documents !== undefined) {
      payload.documents = normalizeDocuments(payload.documents);
    }

    const applicant = await Applicant.findOneAndUpdate(
      { _id: req.params.id, createdBy: recruiterId },
      payload,
      { new: true, runValidators: true }
    );
    if (!applicant) {
      throw new AppError("Applicant not found", 404);
    }

    res.json(ok(serializeApplicant(applicant)));
  } catch (error) {
    next(error);
  }
};

export const updateApplicantAIInternal = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { aiAnalysis } = req.body;

    const applicant = await Applicant.findByIdAndUpdate(
      id,
      { aiAnalysis },
      { new: true }
    );

    if (!applicant) {
      throw new AppError("Applicant not found", 404);
    }

    res.json(ok(serializeApplicant(applicant)));
  } catch (error) {
    next(error);
  }
};

export const deleteApplicant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const applicant = await Applicant.findOneAndDelete({ _id: req.params.id, createdBy: recruiterId });
    if (!applicant) {
      throw new AppError("Applicant not found", 404);
    }
    res.json(ok({ deleted: true }));
  } catch (error) {
    next(error);
  }
};
