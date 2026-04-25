import axios, { Method } from "axios";
import FormData from "form-data";
import { Request } from "express";

export const forwardRequest = async (baseUrl: string, req: Request, method: Method, path: string) => {
  let data: unknown = req.body;
  let headers: Record<string, string> = {
    authorization: req.headers.authorization || ""
  };

  if (req.headers["x-user-id"]) {
    headers["x-user-id"] = String(req.headers["x-user-id"]);
  }

  const isMultipart = !!(req.file || (req.files && (req.files as Express.Multer.File[]).length > 0));

  if (isMultipart) {
    const form = new FormData();
    // Append fields
    for (const key in req.body) {
      if (req.body[key] !== undefined) {
        console.log(`[Proxy] Field: ${key}`);
        form.append(key, req.body[key]);
      }
    }
    // Append multiple files (prioritized)
    if (req.files && Array.isArray(req.files) && req.files.length > 0) {
      (req.files as Express.Multer.File[]).forEach((f) => {
        console.log(`[Proxy] File (req.files): ${f.fieldname}, ${f.originalname}`);
        form.append(f.fieldname, f.buffer, f.originalname);
      });
    } 
    // Fallback to single file if files array is empty or not present
    else if (req.file) {
      console.log(`[Proxy] File (req.file): ${req.file.fieldname}, ${req.file.originalname}`);
      form.append(req.file.fieldname, req.file.buffer, req.file.originalname);
    }
    data = form;
    headers = { ...headers, ...form.getHeaders() };
  } else {
    headers["content-type"] = req.headers["content-type"] || "application/json";
  }

  return axios({
    url: `${baseUrl}${path}`,
    method,
    data,
    params: req.query,
    headers,
    validateStatus: () => true
  });
};
