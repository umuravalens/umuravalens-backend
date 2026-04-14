import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "UmuravaLens API Gateway",
      version: "1.1.0",
      description: "Production-oriented API docs for authentication, recruitment workflow, and dashboard endpoints."
    },
    servers: [{ url: "http://localhost:8080", description: "Local gateway" }],
    tags: [
      { name: "Auth" },
      { name: "Jobs" },
      { name: "Applicants" },
      { name: "Screenings" },
      { name: "Dashboard" }
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
          tags: ["Auth"],
          summary: "Register account",
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
          tags: ["Auth"],
          summary: "Verify email",
          parameters: [{ in: "query", name: "token", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Verified" } }
        }
      },
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Login with email/password",
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
      "/auth/refresh-token": {
        post: {
          tags: ["Auth"],
          summary: "Refresh access token",
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
          tags: ["Auth"],
          summary: "Request password reset",
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
          tags: ["Auth"],
          summary: "Reset password with token",
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
          tags: ["Auth"],
          summary: "Get profile",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Profile" } }
        }
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Logout current session",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Logged out" } }
        }
      },
      "/auth/logout-all": {
        post: {
          tags: ["Auth"],
          summary: "Logout all sessions",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Logged out all" } }
        }
      },
      "/public/jobs/{publicId}": {
        get: {
          tags: ["Jobs"],
          summary: "Get public job details by shareable URL id",
          parameters: [{ in: "path", name: "publicId", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Public job details" } }
        }
      },
      "/public/jobs/{publicId}/apply": {
        post: {
          tags: ["Applicants"],
          summary: "Apply to a public job",
          parameters: [{ in: "path", name: "publicId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "email", "skills", "experienceYears"],
                  properties: {
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    skills: { type: "array", items: { type: "string" } },
                    experienceYears: { type: "number", minimum: 0 },
                    resumeUrl: { type: "string" }
                  }
                }
              }
            }
          },
          responses: { "201": { description: "Application submitted" } }
        }
      },
      "/jobs": {
        get: {
          tags: ["Jobs"],
          summary: "List recruiter jobs",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Jobs list" } }
        },
        post: {
          tags: ["Jobs"],
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
          tags: ["Jobs"],
          summary: "Get recruiter job by ID",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Job" } }
        },
        patch: {
          tags: ["Jobs"],
          summary: "Update job",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Updated" } }
        },
        delete: {
          tags: ["Jobs"],
          summary: "Delete job",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted" } }
        }
      },
      "/applicants": {
        get: {
          tags: ["Applicants"],
          summary: "List applicants (optional jobId filter)",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "query", name: "jobId", schema: { type: "string" } }],
          responses: { "200": { description: "Applicants" } }
        },
        post: {
          tags: ["Applicants"],
          summary: "Create applicant",
          security: [{ bearerAuth: [] }],
          responses: { "201": { description: "Created" } }
        }
      },
      "/applicants/{jobId}": {
        get: {
          tags: ["Applicants"],
          summary: "List applicants by job",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "jobId", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Applicants for job" } }
        }
      },
      "/applicant-items/{id}": {
        get: {
          tags: ["Applicants"],
          summary: "Get applicant by ID",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Applicant" } }
        },
        patch: {
          tags: ["Applicants"],
          summary: "Update applicant",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Updated" } }
        },
        delete: {
          tags: ["Applicants"],
          summary: "Delete applicant",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted" } }
        }
      },
      "/applicants/upload-csv": {
        post: {
          tags: ["Applicants"],
          summary: "Upload applicants CSV",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: { file: { type: "string", format: "binary" } }
                }
              }
            }
          },
          responses: { "201": { description: "CSV imported" } }
        }
      },
      "/applicants/upload-pdf": {
        post: {
          tags: ["Applicants"],
          summary: "Upload resume PDF",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: { file: { type: "string", format: "binary" } }
                }
              }
            }
          },
          responses: { "201": { description: "PDF uploaded" } }
        }
      },
      "/screenings": {
        get: {
          tags: ["Screenings"],
          summary: "List screenings",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "query", name: "jobId", schema: { type: "string" } },
            { in: "query", name: "status", schema: { type: "string", enum: ["pending", "processing", "completed"] } }
          ],
          responses: { "200": { description: "Screenings" } }
        }
      },
      "/screenings/run": {
        post: {
          tags: ["Screenings"],
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
          tags: ["Screenings"],
          summary: "Get screening status",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Status" } }
        }
      },
      "/screenings/{id}/results": {
        get: {
          tags: ["Screenings"],
          summary: "Get screening results",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Results" } }
        }
      },
      "/dashboard/overview": {
        get: {
          tags: ["Dashboard"],
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
