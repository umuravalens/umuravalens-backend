import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const genAI = new GoogleGenerativeAI(env.geminiApiKey);
const model = genAI.getGenerativeModel({ model: env.geminiModel });

export interface MatchResult {
  matchScore: number;
  explanation: {
    strengths: string[];
    gaps: string[];
    comment: string;
  };
}

import fs from "fs";
import path from "path";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function fileToGenerativePart(filePath: string, mimeType: string) {
  // Assuming files are reachable at this path
  const fullPath = path.resolve("apps/applicant-service/src/uploads", filePath);
  if (!fs.existsSync(fullPath)) return null;

  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(fullPath)).toString("base64"),
      mimeType
    },
  };
}

export const analyzeMatch = async (
  job: any,
  applicant: any,
  attempt: number = 1
): Promise<MatchResult> => {
  try {
    const aiDocs = (applicant.documents || []).filter((d: any) => d.sendToAI);
    const parts: any[] = [];

    const prompt = `
    You are an expert talent acquisition AI. Analyze the match between the following Job Description and Applicant Profile.
    
    ### EVALUATION PRIORITIES:
    1. **Core Skills Match**: Prioritize the mandatory skills listed in the job requirements (${job.requirements.skills?.join(", ")}).
    2. **Experience History**: Weigh direct experience in similar roles higher than unrelated years.
    3. **Evidence in Documents**: Look at the attached documents (Portfolios, Samples, etc.) to verify claims made in the profile.
    
    JOB DESCRIPTION:
    Title: ${job.title}
    Description: ${job.description}
    Requirements: ${JSON.stringify(job.requirements)}
    
    APPLICANT PROFILE:
    Name: ${applicant.name}
    Email: ${applicant.email}
    Bio: ${applicant.profileData?.basicInfo?.bio || "N/A"}
    Skills: ${JSON.stringify(applicant.skills || applicant.profileData?.skills || [])}
    Experience: ${JSON.stringify(applicant.profileData?.experience || [])}
    Education: ${JSON.stringify(applicant.profileData?.education || [])}
    Projects: ${JSON.stringify(applicant.profileData?.projects || [])}
    
    OUTPUT FORMAT (JSON ONLY):
    {
      "matchScore": number (0-100),
      "explanation": {
        "strengths": ["string"],
        "gaps": ["string"],
        "comment": "string (A descriptive 200-300 word analysis. Start with a character summary, highlight evidence from their documents, and justify the score.)"
      }
    }
    
    RULES:
    1. Use Evidence: If a portfolio is provided, use it to evaluate quality.
    2. Comment Length: Strictly 200-300 words.
    3. Return ONLY valid JSON.
  `;

    parts.push(prompt);

    // Attach document binaries
    for (const doc of aiDocs) {
      const fileName = doc.storedFileName.toLowerCase();
      let mime = "";

      if (fileName.endsWith(".pdf")) mime = "application/pdf";
      else if (fileName.endsWith(".png")) mime = "image/png";
      else if (fileName.endsWith(".jpg") || fileName.endsWith(".jpeg")) mime = "image/jpeg";
      else if (fileName.endsWith(".webp")) mime = "image/webp";
      else if (fileName.endsWith(".heic")) mime = "image/heic";
      else if (fileName.endsWith(".heif")) mime = "image/heif";

      if (!mime) continue; // Skip unsupported or unknown types

      const part = fileToGenerativePart(doc.storedFileName, mime);
      if (!part) {
        throw new Error(`Critical document missing from filesystem: ${doc.documentName} (${doc.storedFileName})`);
      }
      parts.push(part);
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    let text = response.text();
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    return JSON.parse(text);
  } catch (error: any) {
    if (attempt < 5) {
      const waitTime = Math.pow(2, attempt) * 1000;
      console.warn(`AI Prompt failed (Attempt ${attempt}/5). Retrying in ${waitTime}ms... Error: ${error.message}`);
      await sleep(waitTime);
      return analyzeMatch(job, applicant, attempt + 1);
    }
    throw error;
  }
};
