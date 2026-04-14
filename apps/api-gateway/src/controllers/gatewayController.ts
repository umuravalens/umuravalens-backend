import axios from "axios";
import { NextFunction, Request, Response } from "express";
import { AppError, ok } from "@umurava/shared-utils";
import { env } from "../config/env";
import { forwardRequest } from "../services/proxyService";

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

export const proxyToAuth = (req: Request, res: Response, next: NextFunction) =>
  handle(req, res, next, env.authServiceUrl, req.path.replace(/^\/auth/, "") || "/");

export const proxyToJobs = (req: Request, res: Response, next: NextFunction) =>
  handle(req, res, next, env.jobServiceUrl, req.path);

export const proxyToApplicants = (req: Request, res: Response, next: NextFunction) =>
  handle(req, res, next, env.applicantServiceUrl, req.path);

export const proxyToScreenings = (req: Request, res: Response, next: NextFunction) =>
  handle(req, res, next, env.screeningServiceUrl, req.path);

export const getPublicJobDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const response = await axios.get(`${env.jobServiceUrl}/jobs/public/${req.params.publicId}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    next(new AppError("Failed to fetch public job details", 502));
  }
};

export const submitPublicApplication = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const publicId = req.params.publicId;
    const publicJob = await axios.get(`${env.jobServiceUrl}/jobs/public/${publicId}`);
    const job = publicJob.data?.data;

    if (!job) {
      throw new AppError("Public job not found", 404);
    }

    const payload = {
      ...req.body,
      jobId: job.id,
      recruiterId: String(job.createdBy || "")
    };

    if (!payload.recruiterId) {
      throw new AppError("Public job owner is missing", 400);
    }

    const response = await axios.post(`${env.applicantServiceUrl}/public/apply`, payload);
    res.status(response.status).json(response.data);
  } catch (error) {
    next(new AppError("Failed to submit application", 502));
  }
};

export const getDashboardOverview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const headers = { "x-user-id": String(req.headers["x-user-id"] || "") };

    const [jobsRes, applicantsRes, screeningsRes] = await Promise.all([
      axios.get(`${env.jobServiceUrl}/jobs`, { headers }),
      axios.get(`${env.applicantServiceUrl}/applicants`, { headers }),
      axios.get(`${env.screeningServiceUrl}/screenings`, { headers })
    ]);

    const jobs = jobsRes.data?.data || [];
    const applicants = applicantsRes.data?.data || [];
    const screenings = screeningsRes.data?.data || [];

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
                const topResult = Array.isArray(screening.results) ? screening.results[0] : null;
                return sum + (topResult?.score || 0);
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
    next(new AppError("Failed to load dashboard overview", 502));
  }
};
