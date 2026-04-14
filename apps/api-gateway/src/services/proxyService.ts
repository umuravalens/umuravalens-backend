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

  if (req.file) {
    const form = new FormData();
    form.append("file", req.file.buffer, req.file.originalname);
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
