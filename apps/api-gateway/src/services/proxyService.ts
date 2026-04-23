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
        form.append(key, req.body[key]);
      }
    }
    // Append single file
    if (req.file) {
      form.append("file", req.file.buffer, req.file.originalname);
    }
    // Append multiple files
    if (req.files && Array.isArray(req.files)) {
      (req.files as Express.Multer.File[]).forEach((f) => {
        form.append("files", f.buffer, f.originalname);
      });
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
