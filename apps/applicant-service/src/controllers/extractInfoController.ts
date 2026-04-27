import { Request, Response, NextFunction } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import { AppError, ok } from "@umurava/shared-utils";
import { env } from "../config/env";

const genAI = new GoogleGenerativeAI(env.geminiApiKey);
const GEMINI_MODEL = env.geminiModel;

const SCHEMA_TEMPLATE = {
  "source": "upload",
  "status": "pending",
  "name": "string",
  "email": "string",
  "phoneNumber": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "profileData": {
    "basicInfo": {
      "firstName": "string",
      "lastName": "string",
      "headline": "string",
      "bio": "string",
      "location": "string"
    },
    "skills": [
      {
        "name": "string",
        "level": "Beginner | Intermediate | Advanced | Expert",
        "yearsOfExperience": "number"
      }
    ],
    "languages": [
      {
        "name": "string",
        "proficiency": "Basic | Conversational | Fluent | Native"
      }
    ],
    "experience": [
      {
        "company": "string",
        "role": "string",
        "startDate": "YYYY-MM",
        "endDate": "YYYY-MM | Present",
        "description": "string",
        "technologies": ["string"],
        "isCurrent": "boolean"
      }
    ],
    "education": [
      {
        "institution": "string",
        "degree": "string",
        "fieldOfStudy": "string",
        "startYear": "number",
        "endYear": "number"
      }
    ],
    "certifications": [
      {
        "name": "string",
        "issuer": "string",
        "issueDate": "YYYY-MM"
      }
    ],
    "projects": [
      {
        "name": "string",
        "description": "string",
        "technologies": ["string"],
        "role": "string",
        "link": "string",
        "startDate": "YYYY-MM",
        "endDate": "YYYY-MM"
      }
    ],
    "availability": {
      "status": "Available | Open to Opportunities | Not Available",
      "type": "Full-time | Part-time | Contract",
      "startDate": "YYYY-MM-DD"
    },
    "socialLinks": {
      "platform": "string",
    }
  }
};

function analyzeMissing(data: any, template: any) {
  const missing: any = {};
  let found = false;

  const isEmpty = (val: any) => {
    return val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0);
  };

  for (const key in template) {
    const tVal = template[key];
    const dVal = data ? data[key] : undefined;

    if (Array.isArray(tVal) && tVal.length > 0 && typeof tVal[0] === 'object') {
      if (isEmpty(dVal)) {
        missing[key] = "missing";
        found = true;
      } else {
        const arrayReport = dVal.map((item: any, index: number) => {
          const itemMissing = analyzeMissing(item, tVal[0]);
          return itemMissing ? { index, ...itemMissing } : null;
        }).filter((x: any) => x !== null);

        if (arrayReport.length > 0) {
          missing[key] = arrayReport;
          found = true;
        }
      }
    } else if (typeof tVal === 'object' && !Array.isArray(tVal) && tVal !== null) {
      const nested = analyzeMissing(dVal, tVal);
      if (nested) {
        missing[key] = nested;
        found = true;
      }
    } else {
      const isEffectivelyMissing = isEmpty(dVal) || (key === 'yearsOfExperience' && dVal === 0);
      if (isEffectivelyMissing) {
        missing[key] = "missing";
        found = true;
      }
    }
  }
  return found ? missing : null;
}

function fileToGenerativePart(path: string, mimeType: string) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType
    },
  };
}

export const extractInfo = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file || (req.files && Array.isArray(req.files) && req.files.length > 0 ? (req.files as Express.Multer.File[])[0] : null);
    
    if (!file) {
      throw new AppError("No file uploaded.", 400);
    }

    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const pdfPart = fileToGenerativePart(file.path, "application/pdf");

    const prompt = `
        You are an advanced talent acquisition AI. Your task is to extract information from the provided resume (PDF) into a strictly structured JSON format.
        
        REQUIRED FORMAT:
        ${JSON.stringify(SCHEMA_TEMPLATE, null, 2)}
        
        RULES:
        1. "source" MUST be "upload".
        2. "status" MUST be "pending".
        3. Extract "name", "email", and "phoneNumber" and return the phone number with the country code (ex: +250788888888 for rwandan numbers) from the resume.
        4. In "profileData.basicInfo", break "name" into "firstName" and "lastName".
        5. GENERATE a professional "headline" based on their experience if not explicitly stated (e.g. "Senior Fullstack Developer | Node.js & React expert").
        6. For "skills" get any skills mentioned in the resume, if their "yearsOfExperience" isn't explicitly stated for a skill, set it to 0. DO NOT estimate.
        7. If "availability" data (status, type, startDate) is not provided, leave the fields as empty strings "". Do NOT default to "Not Available" or guess any status.
        8. For "socialLinks", extract all professional social media and portfolio links found. You can add multiple.
        9. For all other missing fields, use "" for strings, 0 for numbers, or [] for arrays.
        10. Dates should be in "YYYY-MM" format. "Present" is allowed for "endDate".
        11. Respond ONLY with the JSON. Do not include markdown formatting or extra text.
        `;

    const result = await model.generateContent([prompt, pdfPart]);
    const response = await result.response;
    let text = response.text();

    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    // Delete the file after it's processed by AI — it should be saved by /apply, not /analyze
    if (file.path && fs.existsSync(file.path)) {
      fs.unlink(file.path, (err) => {
        if (err) console.error(`[extractInfo] Error deleting temp file ${file.path}:`, err);
        else console.log(`[extractInfo] Deleted temp file: ${file.path}`);
      });
    }

    try {
      const resultData = JSON.parse(text);
      const missingFields = analyzeMissing(resultData, SCHEMA_TEMPLATE);
      
      res.json(ok({
        extracted_info: resultData,
        missingFields: missingFields || {},
        tempFile: {
            filename: file.filename,
            path: file.path,
            originalName: file.originalname
        }
      }));
    } catch (parseError) {
      throw new AppError("AI response was not valid JSON", 500);
    }

  } catch (error) {
    next(error);
  }
};
