import axios from "axios";import { Worker } from "bullmq";import IORedis from "ioredis";import { logger } from "@umurava/shared-utils";
import { connectDb } from "./config/db";import { env } from "./config/env";import { Screening } from "./models/Screening";import { rankApplicants } from "./services/rankingService";
const connection=new IORedis(env.redisUrl,{maxRetriesPerRequest:null});
const emitEvent=async(event:string,payload:object)=>{await axios.post(`${env.notificationServiceUrl}/events`,{event,payload});};
const boot=async()=>{await connectDb(env.mongodbUri);const worker=new Worker("screening-queue",async(job)=>{const {screeningId,jobId}=job.data as {screeningId:string;jobId:string};logger.info({message:"Processing screening job",screeningId,jobId});await Screening.findByIdAndUpdate(screeningId,{status:"processing"});await emitEvent("screening_started",{screeningId,jobId});await emitEvent("screening_processing",{screeningId,jobId});const [jobResponse,applicantsResponse]=await Promise.all([axios.get(`${env.jobServiceUrl}/jobs/internal/${jobId}`),axios.get(`${env.applicantServiceUrl}/applicants/internal/${jobId}`)]);const ranked=rankApplicants(jobResponse.data.data,applicantsResponse.data.data);
// Update each applicant with their screening result
await Promise.all(ranked.map((res: any) => 
  axios.patch(`${env.applicantServiceUrl}/applicants/internal/${res.applicantId}/ai`, {
    aiAnalysis: {
      matchScore: res.score,
      rank: res.rank,
      explanation: {
        strengths: [], // Future: extract from AI
        gaps: [],      // Future: extract from AI
        recommendation: res.notes
      }
    }
  })
));
const topScore = ranked.length > 0 ? Math.max(...ranked.map((r: any) => r.score)) : 0;
await new Promise((resolve)=>setTimeout(resolve,2000));await Screening.findByIdAndUpdate(screeningId,{
  status:"completed",
  stats: {
    totalApplicants: ranked.length,
    topScore: topScore,
    shortlistedCount: ranked.filter((r: any) => r.score >= 70).length // Threshold 70
  }
});
await emitEvent("screening_completed",{screeningId,jobId,totalRanked:ranked.length});logger.info({message:"Completed screening job",screeningId});},{connection});worker.on("failed",(failedJob,error)=>{logger.error({message:"Screening job failed",jobId:failedJob?.id,error:error.message});});logger.info({message:"Worker service is running"});};
boot().catch((error)=>{logger.error({message:"Worker failed to start",error});process.exit(1);});
