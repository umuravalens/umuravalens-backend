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
      originalFileName: doc.originalFileName ? String(doc.originalFileName) : ""
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
    const { jobId, name, firstName, lastName, email, phoneNumber, skills, experienceYears, resumeUrl } = req.body;
    if (!jobId || !name || !email || !skills || experienceYears === undefined) {
      throw new AppError("jobId, name, email, skills and experienceYears are required", 400);
    }

    const normalizedFirstName = firstName ? String(firstName).trim() : undefined;
    const normalizedLastName = lastName ? String(lastName).trim() : undefined;

    const applicant = await Applicant.create({
      jobId,
      name,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email,
      phoneNumber: phoneNumber ? String(phoneNumber).trim() : undefined,
      skills: parseSkills(skills),
      experienceYears: Number(experienceYears),
      resumeUrl,
      documents: normalizeDocuments(req.body.documents),
      createdBy: recruiterId,
      source: "recruiter"
    });

    res.status(201).json(ok(withApplicantId(applicant)));
  } catch (error) {
    next(error);
  }
};

export const createPublicApplicantWithFiles = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const publicId = req.params.publicId;
    const jobRes = await axios.get(`${env.jobServiceUrl}/jobs/public/${publicId}`, { validateStatus: () => true });
    if (jobRes.status !== 200 || !jobRes.data?.success || !jobRes.data?.data) {
      throw new AppError("Public job not found", 404);
    }
    const job = jobRes.data.data as { id: string; createdBy: string; status?: string };
    if (job.status && job.status !== "published") {
      throw new AppError("This job is not accepting applications", 400);
    }

    const { firstName, lastName, email, phoneNumber, skills, experienceYears, resumeUrl } = req.body;
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phoneNumber ||
      skills === undefined ||
      skills === null ||
      skills === "" ||
      experienceYears === undefined
    ) {
      throw new AppError(
        "firstName, lastName, email, phoneNumber, skills and experienceYears are required",
        400
      );
    }

    const files = (req.files as Express.Multer.File[]) || [];
    let documentNames: string[] = [];
    const rawNames = req.body.documentNames;
    if (rawNames === undefined || rawNames === null || rawNames === "") {
      documentNames = [];
    } else if (typeof rawNames === "string") {
      try {
        documentNames = JSON.parse(rawNames) as string[];
      } catch {
        throw new AppError(
          'documentNames must be a JSON array of strings (e.g. ["Resume","Cover letter"]) or omitted if no files',
          400
        );
      }
    } else if (Array.isArray(rawNames)) {
      documentNames = rawNames.map((x) => String(x));
    }

    if (!Array.isArray(documentNames)) {
      documentNames = [];
    }
    if (files.length !== documentNames.length) {
      throw new AppError(
        `documentNames must have one label per file (${files.length} file(s), ${documentNames.length} name(s))`,
        400
      );
    }

    const docList: ApplicantDocumentAttachment[] = files.map((file, i) => ({
      documentName: String(documentNames[i]).trim(),
      storedFileName: file.filename,
      originalFileName: file.originalname || ""
    }));

    for (const d of docList) {
      if (!d.documentName) {
        throw new AppError("Each document needs a non-empty name in documentNames", 400);
      }
    }

    const normalizedFirstName = String(firstName).trim();
    const normalizedLastName = String(lastName).trim();
    const fullName = `${normalizedFirstName} ${normalizedLastName}`.trim();

    let resumeUrlOut = resumeUrl ? String(resumeUrl).trim() : undefined;
    if (!resumeUrlOut && docList.length) {
      const resumeDoc = docList.find((d) => /resume|cv/i.test(d.documentName));
      if (resumeDoc) {
        resumeUrlOut = `/uploads/${resumeDoc.storedFileName}`;
      }
    }

    const applicant = await Applicant.create({
      jobId: job.id,
      name: fullName,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      email: String(email).trim(),
      phoneNumber: String(phoneNumber).trim(),
      skills: parseSkills(skills),
      experienceYears: Number(experienceYears),
      resumeUrl: resumeUrlOut,
      documents: docList,
      createdBy: String(job.createdBy),
      source: "public"
    });

    res.status(201).json(ok(withApplicantId(applicant)));
  } catch (error) {
    next(error);
  }
};

export const listApplicants = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const recruiterId = getRecruiterId(req);
    const { page, limit, skip } = getPagination(req);
    const query: any = { createdBy: recruiterId };
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
