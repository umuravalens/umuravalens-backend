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
      { name: "Identity Service", description: "User accounts, authentication, profiles, and candidate source management" },
      { name: "Job Service", description: "Job lifecycle (draft, publish, close) and vacancy management" },
      { name: "Applicant Service", description: "Application intake, recruitment workflow, and resume processing" },
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
          tags: ["Identity Service"],
          summary: "Register new recruiter",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["firstname", "lastname", "email", "password"],
                  properties: {
                    firstname: { type: "string" },
                    lastname: { type: "string" },
                    email: { type: "string" },
                    password: { type: "string", minLength: 6 }
                  }
                }
              }
            }
          },
          responses: {
            "201": { description: "User registered" },
            "409": { description: "Email already in use" }
          }
        }
      },
      "/auth/login": {
        post: {
          tags: ["Identity Service"],
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
          tags: ["Identity Service"],
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
          tags: ["Identity Service"],
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
          tags: ["Identity Service"],
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
      "/auth/verify-email": {
        post: {
          tags: ["Identity Service"],
          summary: "Verify email with token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token"],
                  properties: { token: { type: "string" } }
                }
              }
            }
          },
          responses: {
            "200": { description: "Email verified" },
            "400": { description: "Invalid or expired token" }
          }
        }
      },
      "/auth/resend-verification": {
        post: {
          tags: ["Identity Service"],
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
          responses: { "200": { description: "Verification email sent" } }
        }
      },
      "/auth/reset-password": {
        post: {
          tags: ["Identity Service"],
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
          tags: ["Identity Service"],
          summary: "Get profile",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Profile" } }
        },
        patch: {
          tags: ["Identity Service"],
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
          tags: ["Identity Service"],
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
          tags: ["Identity Service"],
          summary: "Logout current session",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Logged out" } }
        }
      },
      "/auth/logout-all": {
        post: {
          tags: ["Identity Service"],
          summary: "Logout all sessions",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Logged out all" } }
        }
      },
      "/sources": {
        get: {
          tags: ["Identity Service"],
          summary: "List traffic/candidate sources",
          security: [{ bearerAuth: [] }],
          responses: { "200": { description: "Sources list" } }
        },
        post: {
          tags: ["Identity Service"],
          summary: "Create new traffic source",
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["code", "name"],
                  properties: {
                    code: { type: "string", example: "LINKEDIN" },
                    name: { type: "string", example: "LinkedIn Ads" }
                  }
                }
              }
            }
          },
          responses: { "201": { description: "Source created" } }
        },
        put: {
          tags: ["Identity Service"],
          summary: "Update/Rename traffic source",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "oldCode", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["code", "name"],
                  properties: {
                    code: { type: "string", example: "LINKEDIN_NEW" },
                    name: { type: "string", example: "LinkedIn Professional" }
                  }
                }
              }
            }
          },
          responses: { "200": { description: "Source updated" } }
        }
      },
      "/sources/{code}": {
        delete: {
          tags: ["Identity Service"],
          summary: "Delete source",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "code", required: true, schema: { type: "string" } }],
          responses: { "200": { description: "Deleted" } }
        }
      },
      "/jobs/public/{publicId}/{sourceCode}": {
        get: {
          tags: ["Job Service"],
          summary: "Get public job details (Anonymous)",
          security: [],
          description: "Fetches job title and description. If sourceCode is omitted, it defaults to the platform default.",
          parameters: [
            { in: "path", name: "publicId", required: true, schema: { type: "string" } },
            { in: "path", name: "sourceCode", required: false, schema: { type: "string" }, description: "Optional source tracker. Defaults to platform root if empty." }
          ],
          responses: { "200": { description: "Public Job Details" }, "403": { description: "Invalid source" } }
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
            { in: "query", name: "status", schema: { type: "string", enum: ["draft", "published", "closed", "archived"] } },
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
                    sources: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          code: { type: "string" }
                        }
                      }
                    },
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
                    status: { type: "string", enum: ["draft", "published", "closed", "archived"] }
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
      "/applicants/analyze": {
        post: {
          tags: ["Applicant Service"],
          summary: "AI Resume Analysis (Public)",
          description: "Upload a PDF resume to extract structured data using Gemini AI. No authentication required.",
          security: [],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["resume"],
                  properties: { resume: { type: "string", format: "binary" } }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "AI extraction results with full profile layout",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      extracted_info: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          email: { type: "string" },
                          phoneNumber: { type: "string" },
                          profileData: {
                            type: "object",
                            properties: {
                              basicInfo: {
                                type: "object",
                                properties: {
                                  firstName: { type: "string" },
                                  lastName: { type: "string" },
                                  phoneNumber: { type: "string" },
                                  headline: { type: "string" },
                                  bio: { type: "string" },
                                  location: { type: "string" }
                                }
                              },
                              skills: { type: "array", items: { type: "object", properties: { name: { type: "string" }, level: { type: "string" }, yearsOfExperience: { type: "number" } } } },
                              languages: { type: "array", items: { type: "object", properties: { name: { type: "string" }, proficiency: { type: "string" } } } },
                              experience: { type: "array", items: { type: "object", properties: { company: { type: "string" }, role: { type: "string" }, startDate: { type: "string" }, endDate: { type: "string" }, description: { type: "string" }, technologies: { type: "array", items: { type: "string" } }, isCurrent: { type: "boolean" } } } },
                              education: { type: "array", items: { type: "object", properties: { institution: { type: "string" }, degree: { type: "string" }, fieldOfStudy: { type: "string" }, startYear: { type: "number" }, endYear: { type: "number" } } } },
                              certifications: { type: "array", items: { type: "object", properties: { name: { type: "string" }, issuer: { type: "string" }, issueDate: { type: "string" } } } },
                              projects: { type: "array", items: { type: "object", properties: { name: { type: "string" }, description: { type: "string" }, technologies: { type: "array", items: { type: "string" } }, role: { type: "string" }, link: { type: "string" }, startDate: { type: "string" }, endDate: { type: "string" } } } },
                              availability: { type: "object", properties: { status: { type: "string" }, type: { type: "string" }, startDate: { type: "string" } } },
                              socialLinks: { type: "object", additionalProperties: { type: "string" } }
                            }
                          }
                        }
                      },
                      missingFields: { type: "object", description: "Report of fields the AI couldn't find" },
                      tempFile: { type: "object", properties: { filename: { type: "string" }, path: { type: "string" }, originalName: { type: "string" } } }
                    }
                  }
                }
              }
            }
          }
        }
      },
      "/applicants/apply": {
        post: {
          tags: ["Applicant Service"],
          summary: "Submit application (Public)",
          description: "Post-analysis or manual application submission. No authentication required.",
          security: [],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["verifiedData", "jobId", "source_code"],
                  properties: {
                    verifiedData: { 
                      type: "string", 
                      description: "JSON string of candidate info (follows same structure as Analyze response)" 
                    },
                    jobId: { type: "string" },
                    source_code: { type: "string" },
                    otherDocuments: { type: "string", description: "JSON string of existing doc links" },
                    files: { type: "array", items: { type: "string", format: "binary" }, description: "Additional documents/images" }
                  }
                }
              }
            }
          },
          responses: { 
            "201": { 
              description: "Application submitted (Status: draft)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      applicantId: { type: "string" },
                      status: { type: "string", example: "draft" },
                      name: { type: "string" },
                      email: { type: "string" },
                      phoneNumber: { type: "string" },
                      profileData: { type: "object" }
                    }
                  }
                }
              }
            } 
          }
        }
      },
      "/applicants/verify/{applicantId}": {
        post: {
          tags: ["Applicant Service"],
          summary: "Verify applicant credentials (Public)",
          security: [],
          parameters: [{ in: "path", name: "applicantId", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    profileData: { type: "string", description: "JSON string of updated profile info" },
                    files: { type: "array", items: { type: "string", format: "binary" }, description: "Additional docs during verification" }
                  }
                }
              }
            }
          },
          responses: { 
            "200": { 
              description: "Verified application (Promoted to 'pending' if no changes detected)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      applicantId: { type: "string" },
                      status: { type: "string", example: "pending" },
                      profileData: { type: "object" }
                    }
                  }
                }
              }
            } 
          }
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
          summary: "Create applicant manually",
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
