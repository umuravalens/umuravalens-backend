import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "UmuravaLens API Gateway",
      version: "1.1.0",
      description:
        "Production-oriented API docs for authentication, recruitment workflow, and dashboard endpoints. **Public job and application routes** (`/public/jobs/...`, applicant uploads under `/uploads/...`) do **not** require a JWT; omit `Authorization` for those calls. In Swagger UI, operations with `security: []` ignore the global Authorize token."
    },
    servers: [{ url: "http://localhost:8080", description: "Local gateway" }],
    tags: [
      { name: "Auth Service", description: "Identity, sessions, profile, and account security endpoints" },
      { name: "Job Service", description: "Job posting and public job access endpoints" },
      { name: "Applicant Service", description: "Applicant management and application intake endpoints" },
      { name: "Screening Service", description: "AI screening orchestration and status endpoints" },
      { name: "Dashboard Service", description: "Aggregated analytics endpoints served by the gateway" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" }
      },
      schemas: {
        ApiResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            data: {},
            error: { type: "string", nullable: true }
          }
        }
      }
    },
    paths: {
      "/auth/register": {
        post: {
          tags: ["Auth Service"],
          summary: "Register account",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "password"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 6 }
                  }
                }
              }
            }
          },
          responses: { "201": { description: "Registered" } }
        }
      },
      "/auth/verify-email": {
        get: {
          tags: ["Auth Service"],
          summary: "Verify email",
          security: [],
          parameters: [{ in: "query", name: "token", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Verified" } }
        }
      },
      "/auth/resend-verification": {
        post: {
          tags: ["Auth Service"],
          summary: "Resend verification email",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string", format: "email" } }
                }
              }
            }
          },
          responses: { "200": { description: "Verification email initiated" } }
        }
      },
      "/auth/login": {
        post: {
          tags: ["Auth Service"],
          summary: "Login with email/password",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" }
                  }
                }
              }
            }
          },
          responses: { "200": { description: "Returns access + refresh tokens" } }
        }
      },
      "/auth/google": {
        post: {
          tags: ["Auth Service"],
          summary: "Login or signup with Google",
          security: [],
          description: "Frontend sends Google ID token from Google Sign-In. If user does not exist, account is created.",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["idToken"],
                  properties: {
                    idToken: { type: "string" }
                  }
                }
              }
            }
          },
          responses: { "200": { description: "Returns access + refresh tokens" } }
        }
      },
      "/auth/refresh-token": {
        post: {
          tags: ["Auth Service"],
          summary: "Refresh access token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: { refreshToken: { type: "string" } }
                }
              }
            }
          },
          responses: { "200": { description: "Token refreshed" } }
        }
      },
      "/auth/forgot-password": {
        post: {
          tags: ["Auth Service"],
          summary: "Request password reset",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: { email: { type: "string", format: "email" } }
                }
              }
            }
          },
          responses: { "200": { description: "Reset initiated" } }
        }
      },
      "/auth/reset-password": {
        post: {
          tags: ["Auth Service"],
          summary: "Reset password with token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "newPassword"],
                  properties: {
                    token: { type: "string" },
                    newPassword: { type: "string", minLength: 6 }
                  }
                }
              }
            }
          },
          responses: { "200": { description: "Password reset" } }
        }
      },
      "/auth/me": {
        get: {
          tags: ["Auth Service"],
          summary: "Get profile",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Profile" } }
        },
        patch: {
          tags: ["Auth Service"],
          summary: "Update profile details",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" }
                  },
                  minProperties: 1
                }
              }
            }
          },
          responses: { "200": { description: "Profile updated" } }
        }
      },
      "/auth/change-password": {
        patch: {
          tags: ["Auth Service"],
          summary: "Change password for authenticated user",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currentPassword", "newPassword"],
                  properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string", minLength: 6 }
                  }
                }
              }
            }
          },
          responses: { "200": { description: "Password changed" } }
        }
      },
      "/auth/logout": {
        post: {
          tags: ["Auth Service"],
          summary: "Logout current session",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Logged out" } }
        }
      },
      "/auth/logout-all": {
        post: {
          tags: ["Auth Service"],
          summary: "Logout all sessions",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Logged out all" } }
        }
      },
      "/public/jobs/{publicId}": {
        get: {
          tags: ["Job Service"],
          summary: "Get public job details by shareable URL id",
          security: [],
          description:
            "Returns only jobs with status **published**. Draft or unpublished jobs respond with **404** (same as unknown id).",
          parameters: [{ in: "path", name: "publicId", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Public job details" },
            "404": { description: "Not found or job is not published" }
          }
        }
      },
      "/public/jobs/{publicId}/apply": {
        post: {
          tags: ["Applicant Service"],
          summary: "Apply to a public job (multipart — only public apply endpoint)",
          security: [],
          description:
            "Single request: text fields plus optional files. Repeat field `files` for each binary. `documentNames` is a JSON string array with one label per file in order, or `[]` if no files. `skills` as comma-separated text. Authenticated applicant list/detail responses include `documents[].fileUrl` (path under this gateway) for viewing in the browser.",
          parameters: [{ in: "path", name: "publicId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["firstName", "lastName", "email", "phoneNumber", "skills", "experienceYears"],
                  properties: {
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string", format: "email" },
                    phoneNumber: { type: "string" },
                    skills: { type: "string", description: "Comma-separated skills", example: "Node.js,MongoDB" },
                    experienceYears: { type: "string", description: "Number as text", example: "3" },
                    resumeUrl: { type: "string", description: "Optional external link" },
                    documentNames: {
                      type: "string",
                      description: 'JSON array of labels, same order as files, e.g. ["Resume","Certificate"]',
                      example: '["Resume","Cover letter"]'
                    },
                    files: { type: "array", items: { type: "string", format: "binary" }, description: "Repeat field name `files` for each upload" }
                  }
                }
              }
            }
          },
          responses: {
            "201": {
              description:
                "Created. `data.documents[]` includes `fileUrl` (e.g. `/uploads/...`) for the gateway; use `GET` on that path to open the file."
            }
          }
        }
      },
      "/uploads/{filename}": {
        get: {
          tags: ["Applicant Service"],
          summary: "Get uploaded file (for frontend preview/download)",
          security: [],
          description:
            "Use the path from `documents[].fileUrl` on applicant records (e.g. `http://localhost:8080/uploads/1712345678-resume.pdf`). No auth.",
          parameters: [{ in: "path", name: "filename", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "File stream" }, "404": { description: "Not found" } }
        }
      },
      "/jobs": {
        get: {
          tags: ["Job Service"],
          summary: "List recruiter jobs",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "status", schema: { type: "string", enum: ["draft", "published", "closed"] } },
            { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
          ],
          responses: { "200": { description: "Jobs list" } }
        },
        post: {
          tags: ["Job Service"],
          summary: "Create job",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["title", "description", "requirements"],
                  properties: {
                    title: { type: "string" },
                    description: { type: "string" },
                    department: { type: "string", example: "Engineering" },
                    requirements: {
                      type: "object",
                      required: ["skills", "experience"],
                      properties: {
                        skills: { type: "array", items: { type: "string" }, minItems: 1 },
                        experience: { type: "number", minimum: 0 }
                      }
                    },
                    location: { type: "string" },
                    employmentType: { type: "string" },
                    status: { type: "string", enum: ["draft", "published", "closed"] }
                  }
                }
              }
            }
          },
          responses: { "201": { description: "Created" } }
        }
      },
      "/jobs/{id}": {
        get: {
          tags: ["Job Service"],
          summary: "Get recruiter job by ID",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Job" } }
        },
        patch: {
          tags: ["Job Service"],
          summary: "Update job",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Updated" } }
        },
        delete: {
          tags: ["Job Service"],
          summary: "Delete job",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted" } }
        }
      },
      "/jobs/{id}/publish": {
        post: {
          tags: ["Job Service"],
          summary: "Publish job",
          description: "Sets status to **published** so the job appears on `GET /public/jobs/{publicId}` and accepts applications.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Published; includes publicUrl" } }
        }
      },
      "/applicants": {
        get: {
          tags: ["Applicant Service"],
          summary: "List applicants (optional jobId filter)",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "jobId", schema: { type: "string" } },
            { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
          ],
          responses: { "200": { description: "Applicants" } }
        },
        post: {
          tags: ["Applicant Service"],
          summary: "Create applicant",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Created" } }
        }
      },
      "/applicants/{jobId}": {
        get: {
          tags: ["Applicant Service"],
          summary: "List applicants by job",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "jobId", required: true, schema: { type: "string" } },
            { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
          ],
          responses: { "200": { description: "Applicants for job" } }
        }
      },
      "/applicant-items/{id}": {
        get: {
          tags: ["Applicant Service"],
          summary: "Get applicant by ID",
          security: [{ bearerAuth: [] }],
          description: "Each `documents[]` entry includes `fileUrl` for opening the file on this API host.",
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Applicant" } }
        },
        patch: {
          tags: ["Applicant Service"],
          summary: "Update applicant",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Updated" } }
        },
        delete: {
          tags: ["Applicant Service"],
          summary: "Delete applicant",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted" } }
        }
      },
      "/screenings": {
        get: {
          tags: ["Screening Service"],
          summary: "List screenings",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "jobId", schema: { type: "string" } },
            { in: "query", name: "status", schema: { type: "string", enum: ["pending", "processing", "completed"] } },
            { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
          ],
          responses: { "200": { description: "Screenings" } }
        }
      },
      "/screenings/run": {
        post: {
          tags: ["Screening Service"],
          summary: "Start screening",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["jobId"],
                  properties: { jobId: { type: "string" } }
                }
              }
            }
          },
          responses: { "202": { description: "Queued" } }
        }
      },
      "/screenings/{id}/status": {
        get: {
          tags: ["Screening Service"],
          summary: "Get screening status",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Status" } }
        }
      },
      "/screenings/{id}/results": {
        get: {
          tags: ["Screening Service"],
          summary: "Get screening results",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Results" } }
        }
      },
      "/dashboard/overview": {
        get: {
          tags: ["Dashboard Service"],
          summary: "Get dashboard overview metrics",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Overview" } }
        }
      }
    }
  },
  apis: []
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
