import axios from "axios";
import { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { AppError, ok, logger } from "@umurava/shared-utils";
import { env } from "../config/env";
import { Applicant, ApplicantDocumentAttachment } from "../models/Applicant";
import { emitJobMetricsUpdate } from "../utils/queue";

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

const getDocumentName = (file: Express.Multer.File): string => {
  let name = file.fieldname;
  if (!name || name === "files" || name === "file") {
    // Heuristic fallbacks if the key is generic
    if (file.originalname.toLowerCase().includes("resume")) return "resume";
    name = file.originalname.split(".")[0];
  }

  return name.toLowerCase();
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
      fileUrl: doc.fileUrl ? String(doc.fileUrl) : `/uploads/${storedFileName}`,
      isAdditional: !!doc.isAdditional,
      isVerified: !!doc.isVerified,
      sendToAI: !!doc.sendToAI
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
    const { jobId, name, email, phoneNumber, profileData, resumeUrl, application_source } = req.body;
    if (!jobId || !name || !email || !phoneNumber || !profileData || !application_source) {
      throw new AppError("jobId, name, email, phoneNumber, profileData and application_source are required", 400);
    }

    const applicant = await Applicant.create({
      jobId,
      name,
      email,
      phoneNumber,
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
    const rawBody = req.body as Record<string, unknown>;
    const verifiedData = typeof rawBody.verifiedData === 'string' ? JSON.parse(rawBody.verifiedData) : rawBody.verifiedData;
    const jobId = rawBody.jobId as string;
    const source_code = rawBody.source_code as string;
    const otherDocsJson = typeof rawBody.otherDocuments === 'string' ? JSON.parse(rawBody.otherDocuments) : rawBody.otherDocuments;

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

    // Document Validation & Deduplication
    const requiredDocs = job.requiredDocuments || [];
    const uploadedFiles = (req.files as Express.Multer.File[]) || [];
    const dir = path.resolve(env.uploadDir);
    
    // Start with documents already provided (e.g. from previous extraction step)
    // Filter out entries whose files don't actually exist on disk (fallback to upload)
    const docList: ApplicantDocumentAttachment[] = (otherDocsJson || [])
      .filter((d: any) => {
        if (!d.storedFileName || !d.documentName) return false;
        const exists = fs.existsSync(path.join(dir, d.storedFileName));
        if (!exists) console.log(`[ApplicantService] Referenced document ${d.documentName} (${d.storedFileName}) missing from disk, will rely on new upload if provided.`);
        return exists;
      })
      .map((d: any) => ({
        ...d,
        uploadDate: d.uploadDate ? new Date(String(d.uploadDate)) : new Date(),
        fileUrl: d.fileUrl || `/uploads/${d.storedFileName}`,
        isAdditional: d.isAdditional !== undefined ? !!d.isAdditional : !requiredDocs.some((rd: any) => rd.documentType.toLowerCase() === d.documentName.toLowerCase()),
        isVerified: !!d.isVerified,
        sendToAI: !!d.sendToAI
      }));

    const existingNames = new Set(docList.map(d => d.documentName));
    console.log(`[ApplicantService] Valid existing documents in request: ${Array.from(existingNames).join(", ")}`);

    for (const file of uploadedFiles) {
      const docName = getDocumentName(file);
      const isReq = requiredDocs.some((rd: any) => rd.documentType.toLowerCase() === docName.toLowerCase());
      const storedName = file.filename || file.originalname;
      
      // DEDUPLICATION: If we already have a valid document of this type, skip adding it again from binary
      if (existingNames.has(docName)) {
        console.log(`[ApplicantService] Skipping redundant binary for document type: ${docName} (File: ${file.originalname})`);
        const filePath = path.join(dir, storedName);
        if (fs.existsSync(filePath)) {
          fs.unlink(filePath, () => {});
        }
        continue;
      }

      const { buffer, ...fileMeta } = file;
      console.log(`[ApplicantService] Adding newly uploaded file: ${file.originalname} (Document Name: ${docName})`, fileMeta);
      
      docList.push({
        documentName: docName,
        originalFileName: file.originalname,
        storedFileName: storedName,
        uploadDate: new Date(),
        fileUrl: `/uploads/${storedName}`,
        isAdditional: !isReq,
        isVerified: false,
        sendToAI: false
      });
      existingNames.add(docName);
    }

    const providedDocNames = docList.map(d => d.documentName.toLowerCase());
    for (const reqDoc of requiredDocs) {
      if (reqDoc.isRequired && !providedDocNames.includes(reqDoc.documentType.toLowerCase())) {
        throw new AppError(`Missing required document: ${reqDoc.documentType}`, 400);
      }
    }

    const additionalCount = docList.filter(d => d.isAdditional).length;
    if (additionalCount > 3) {
      throw new AppError("Maximum 3 additional documents allowed", 400);
    }

    const resumeDoc = docList.find(d => d.documentName.toLowerCase() === 'resume');
    const resumeUrl = resumeDoc ? resumeDoc.fileUrl : "";
    console.log(`[ApplicantService] Final resumeUrl: "${resumeUrl}" (Source doc found: ${!!resumeDoc})`);

    // Check for existing application with same email and specific statuses before creating
    const existing = await Applicant.findOne({
      email: verifiedData.email,
      status: { $in: ["pending", "shortlisted", "rejected"] },
      jobId: jobId
    });

    if (existing) {
      throw new AppError("An application with this email already exists for this job", 400);
    }

    // Sync AI flags for required documents
    for (const doc of docList) {
      if (!doc.isAdditional) {
        const reqDoc = requiredDocs.find((rd: any) => rd.documentType.toLowerCase() === doc.documentName.toLowerCase());
        if (reqDoc) {
          doc.sendToAI = reqDoc.sendToAI;
        }
      }
    }

    const applicant = await Applicant.create({
      jobId,
      source: "upload",
      application_source: source_code,
      status: "pending",
      name: verifiedData.name,
      email: verifiedData.email,
      phoneNumber: verifiedData.phoneNumber,
      profileData: verifiedData.profileData,
      resumeUrl: resumeUrl,
      documents: docList
    });

    await emitJobMetricsUpdate({ 
      jobId, 
      action: "increment", 
      metric: "applicantCount", 
      sourceCode: source_code 
    });

    if (additionalCount > 0) {
      await emitJobMetricsUpdate({ 
        jobId, 
        action: "increment", 
        metric: "unverifiedFilesCount" 
      });
    }

    res.status(201).json(ok(serializeApplicant(applicant)));
  } catch (error) {
    next(error);
  }
};



export const listApplicants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const { page, limit, skip } = getPagination(req);
    const query: any = { status: { $ne: "draft" } };
    if (req.query.jobId) {
      query.jobId = String(req.query.jobId);
    }
    if (req.query.source) {
      query.application_source = String(req.query.source);
    }
    if (req.query.needsVerification === "true") {
      query.documents = { $elemMatch: { isAdditional: true, isVerified: false } };
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
    const query = { jobId: req.params.jobId, status: { $ne: "draft" } };
    const [applicants, total] = await Promise.all([
      Applicant.find(query).sort({ createdAt: -1 }),
      Applicant.countDocuments(query)
    ]);
    res.json(
      ok({
        items: applicants,
        total
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

export const verifyDocument = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req); // Or allow based on internal auth
    const { id, storedFileName } = req.params;

    const applicant = await Applicant.findById(id);
    if (!applicant) {
      throw new AppError("Applicant not found", 404);
    }

    const docIndex = applicant.documents.findIndex(d => d.storedFileName === storedFileName);
    if (docIndex === -1) {
      throw new AppError("Document not found", 404);
    }

    applicant.documents[docIndex].isVerified = true;

    // Check if this was the last unverified additional document
    const remainingUnverifiedAdditional = applicant.documents.some(d => d.isAdditional && !d.isVerified);

    await applicant.save();

    if (!remainingUnverifiedAdditional) {
      await emitJobMetricsUpdate({
        jobId: applicant.jobId,
        action: "decrement",
        metric: "unverifiedFilesCount"
      });
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
