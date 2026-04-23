import axios from "axios";
import FormData from "form-data";
import { NextFunction, Request, Response } from "express";
import { AppError, logger, ok } from "@umurava/shared-utils";
import { env } from "../config/env";
import { forwardRequest } from "../services/proxyService";

/** Pass through job/applicant service error bodies (e.g. 404) instead of masking as 502. */
const forwardAxiosError = (res: Response, error: unknown): boolean => {
  if (axios.isAxiosError(error) && error.response) {
    res.status(error.response.status).json(error.response.data);
    return true;
  }
  return false;
};

/** List endpoints return `{ items, pagination }` inside `data`, not a raw array. */
const takeListItems = (data: unknown): any[] => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: any[] }).items;
  }
  return [];
};

interface JobMetric {
  id: string;
  title: string;
  status: string;
  location: string | null;
  employmentType: string | null;
  requiredSkillsCount: number;
  requiredExperience: number;
  applicantsCount: number;
  screeningsCount: number;
  conversionRate: number;
  createdAt?: string;
}

interface ActivityItem {
  type: string;
  timestamp: string;
  title: string;
  jobId?: string;
  screeningId?: string;
  applicantId?: string;
}

const handle = async (req: Request, res: Response, next: NextFunction, base: string, path: string) => {
  try {
    const response = await forwardRequest(base, req, req.method as any, path);
    res.status(response.status).json(response.data);
  } catch (error) {
    next(error);
  }
};

export const proxyToIdentity = (req: Request, res: Response, next: NextFunction) =>
  handle(req, res, next, env.identityServiceUrl, req.path.replace(/^\/identity/, "") || "/");

export const proxyToJobs = (req: Request, res: Response, next: NextFunction) =>
  handle(req, res, next, env.jobServiceUrl, req.path);

export const proxyToApplicants = (req: Request, res: Response, next: NextFunction) =>
  handle(req, res, next, env.applicantServiceUrl, req.path.replace(/^\/applicants/, "") || "/");

export const proxyToScreenings = (req: Request, res: Response, next: NextFunction) =>
  handle(req, res, next, env.screeningServiceUrl, req.path);

export const getPublicJobDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await axios.get(`${env.jobServiceUrl}/jobs/public/${req.params.publicId}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    if (!forwardAxiosError(res, error)) {
      next(new AppError("Failed to fetch public job details", 502));
    }
  }
};

/** Multipart public apply: text fields + repeated `files` + `documentNames` JSON array (same order as files). */
export const submitPublicApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const form = new FormData();
    const body = req.body as Record<string, string | undefined>;
    for (const key of ["firstName", "lastName", "email", "phoneNumber", "skills", "experienceYears", "resumeUrl"]) {
      if (body[key] !== undefined && body[key] !== null && body[key] !== "") {
        form.append(key, String(body[key]));
      }
    }
    const docNamesRaw = body.documentNames;
    form.append(
      "documentNames",
      docNamesRaw !== undefined && docNamesRaw !== null && String(docNamesRaw).trim() !== ""
        ? String(docNamesRaw)
        : "[]"
    );
    const files = (req.files as Express.Multer.File[]) || [];
    for (const f of files) {
      form.append("files", f.buffer, f.originalname);
    }
    const response = await axios.post(
      `${env.applicantServiceUrl}/public/jobs/${req.params.publicId}/apply`,
      form,
      {
        headers: form.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
        validateStatus: () => true
      }
    );
    res.status(response.status).json(response.data);
  } catch (error) {
    if (!forwardAxiosError(res, error)) {
      next(new AppError("Failed to submit application", 502));
    }
  }
};

/** Stream file from applicant-service. Uses originalUrl so path is correct when mounted on /uploads. */
export const proxyApplicantUploads = async (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    next();
    return;
  }
  try {
    const pathname = (req.originalUrl || "").split("?")[0];
    const prefix = "/uploads/";
    if (!pathname.startsWith(prefix)) {
      next(new AppError("Invalid path", 400));
      return;
    }
    const rel = pathname.slice(prefix.length);
    if (!rel || rel.includes("..")) {
      next(new AppError("File not found", 404));
      return;
    }
    const base = env.applicantServiceUrl.replace(/\/$/, "");
    const encoded = rel
      .split("/")
      .filter(Boolean)
      .map((seg) => {
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join("/");
    const url = `${base}/uploads/${encoded}`;

    const response = await axios.get(url, {
      responseType: "stream",
      validateStatus: () => true,
      timeout: 120_000
    });
    if (response.status >= 400) {
      logger.warn({ message: "Applicant upload GET returned non-OK", url, status: response.status });
      next(new AppError("File not found", 404));
      return;
    }
    const ct = response.headers["content-type"];
    if (ct) {
      res.setHeader("Content-Type", ct);
    }
    const cl = response.headers["content-length"];
    if (cl) {
      res.setHeader("Content-Length", cl as string);
    }
    const cd = response.headers["content-disposition"];
    if (cd) {
      res.setHeader("Content-Disposition", cd);
    }
    response.data.on("error", (err: Error) => {
      logger.error({ message: "Upload stream read error", err: err.message, url });
      if (!res.headersSent) {
        next(new AppError("File transfer failed", 500));
      }
    });
    res.on("close", () => {
      if (response.data && typeof response.data.destroy === "function") {
        response.data.destroy();
      }
    });
    response.data.pipe(res);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND" || error.code === "ECONNRESET") {
        logger.error({ message: "Applicant service unreachable for uploads", code: error.code });
        next(new AppError("Upload service unavailable", 503));
        return;
      }
      if (error.response?.status === 404) {
        next(new AppError("File not found", 404));
        return;
      }
    }
    logger.error({ message: "proxyApplicantUploads failed", error });
    next(new AppError("File not found", 404));
  }
};

export const getDashboardOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const headers = { "x-user-id": String(req.headers["x-user-id"] || "") };
    const params = { page: 1, limit: 100 };

    const [jobsRes, applicantsRes, screeningsRes] = await Promise.all([
      axios.get(`${env.jobServiceUrl}/jobs`, { headers, params }),
      axios.get(`${env.applicantServiceUrl}/applicants`, { headers, params }),
      axios.get(`${env.screeningServiceUrl}/screenings`, { headers, params })
    ]);

    const jobs = takeListItems(jobsRes.data?.data);
    const applicants = takeListItems(applicantsRes.data?.data);
    const screenings = takeListItems(screeningsRes.data?.data);

    const screeningsByStatus = screenings.reduce(
      (acc: Record<string, number>, screening: { status: string }) => {
        acc[screening.status] = (acc[screening.status] || 0) + 1;
        return acc;
      },
      { pending: 0, processing: 0, completed: 0 }
    );

    const applicantsByJob = applicants.reduce((acc: Record<string, number>, applicant: { jobId: string }) => {
      acc[applicant.jobId] = (acc[applicant.jobId] || 0) + 1;
      return acc;
    }, {});

    const screeningsByJob = screenings.reduce((acc: Record<string, number>, screening: { jobId: string }) => {
      acc[screening.jobId] = (acc[screening.jobId] || 0) + 1;
      return acc;
    }, {});

    const completedResults = screenings.filter((screening: any) => screening.status === "completed");
    const averageTopScore =
      completedResults.length === 0
        ? 0
        : Number(
            (
              completedResults.reduce((sum: number, screening: any) => {
                return sum + (screening.stats?.topScore || 0);
              }, 0) / completedResults.length
            ).toFixed(2)
          );

    const totalRequiredSkills = jobs.reduce(
      (sum: number, job: any) => sum + (Array.isArray(job.requirements?.skills) ? job.requirements.skills.length : 0),
      0
    );
    const averageRequiredSkillsPerJob = jobs.length ? Number((totalRequiredSkills / jobs.length).toFixed(2)) : 0;

    const skillsCount = new Map<string, number>();
    applicants.forEach((applicant: any) => {
      if (!Array.isArray(applicant.skills)) return;
      applicant.skills.forEach((skill: string) => {
        const normalized = String(skill || "").trim().toLowerCase();
        if (!normalized) return;
        skillsCount.set(normalized, (skillsCount.get(normalized) || 0) + 1);
      });
    });

    const topSkills = Array.from(skillsCount.entries())
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const jobsWithMetrics: JobMetric[] = jobs
      .map((job: any) => {
        const jobApplicants = applicantsByJob[job._id] || 0;
        const jobScreenings = screeningsByJob[job._id] || 0;
        return {
          id: job._id,
          title: job.title,
          status: job.status || "published",
          location: job.location || null,
          employmentType: job.employmentType || null,
          requiredSkillsCount: Array.isArray(job.requirements?.skills) ? job.requirements.skills.length : 0,
          requiredExperience: job.requirements?.experience || 0,
          applicantsCount: jobApplicants,
          screeningsCount: jobScreenings,
          conversionRate: jobApplicants ? Number(((jobScreenings / jobApplicants) * 100).toFixed(2)) : 0,
          createdAt: job.createdAt
        };
      })
      .sort((a: JobMetric, b: JobMetric) => b.applicantsCount - a.applicantsCount);

    const recentActivity = [
      ...jobs.slice(0, 5).map((job: any) => ({
        type: "job_created",
        timestamp: job.createdAt,
        title: `Job posted: ${job.title}`,
        jobId: job._id
      })),
      ...screenings.slice(0, 5).map((screening: any) => ({
        type: "screening_updated",
        timestamp: screening.updatedAt || screening.createdAt,
        title: `Screening ${screening.status} for job ${screening.jobId}`,
        screeningId: screening._id,
        jobId: screening.jobId
      })),
      ...applicants.slice(0, 5).map((applicant: any) => ({
        type: "applicant_added",
        timestamp: applicant.createdAt,
        title: `Applicant added: ${applicant.name}`,
        applicantId: applicant._id,
        jobId: applicant.jobId
      }))
    ] as ActivityItem[];

    const sortedRecentActivity = recentActivity
      .filter((item: ActivityItem) => item.timestamp)
      .sort((a: ActivityItem, b: ActivityItem) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 15);

    const alerts: Array<{ severity: "info" | "warning"; message: string }> = [];
    if (screeningsByStatus.pending > 10) {
      alerts.push({ severity: "warning", message: "High number of pending screenings. Consider scaling workers." });
    }
    if (jobsWithMetrics.some((job: JobMetric) => job.applicantsCount === 0)) {
      alerts.push({ severity: "info", message: "Some jobs have no applicants yet." });
    }
    if (jobsWithMetrics.length === 0) {
      alerts.push({ severity: "info", message: "No jobs available. Create your first job posting." });
    }

    res.json(
      ok({
        summary: {
          totalJobs: jobs.length,
          totalApplicants: applicants.length,
          totalScreenings: screenings.length,
          pendingScreenings: screeningsByStatus.pending || 0,
          processingScreenings: screeningsByStatus.processing || 0,
          completedScreenings: screeningsByStatus.completed || 0,
          averageTopScore,
          averageRequiredSkillsPerJob
        },
        pipeline: {
          jobs: jobs.length,
          applicants: applicants.length,
          screeningsStarted: screenings.length,
          screeningsCompleted: screeningsByStatus.completed || 0
        },
        breakdowns: {
          screeningsByStatus,
          topSkills,
          jobsByStatus: jobs.reduce((acc: Record<string, number>, job: any) => {
            const status = job.status || "published";
            acc[status] = (acc[status] || 0) + 1;
            return acc;
          }, {})
        },
        jobs: {
          topByApplicants: jobsWithMetrics.slice(0, 10),
          latest: jobs.slice(0, 10)
        },
        screenings: {
          latest: screenings.slice(0, 10)
        },
        applicants: {
          latest: applicants.slice(0, 10)
        },
        recentActivity: sortedRecentActivity,
        alerts
      })
    );
  } catch (error) {
    if (!forwardAxiosError(res, error)) {
      next(new AppError("Failed to load dashboard overview", 502));
    }
  }
};
