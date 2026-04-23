import swaggerJsdoc from "swagger-jsdoc";

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "UmuravaLens API Gateway",
      version: "1.1.0",
      description:
        "Production-oriented API docs for authentication, recruitment workflow, and dashboard endpoints. \n\n **[View Raw JSON API Specification](/api/v3)** \n\n **[WebSocket Documentation (AsyncAPI)](/docs/asyncapi)** \n\n **Public job and application routes** (`/public/jobs/...`, applicant uploads under `/uploads/...`) do **not** require a JWT; omit `Authorization` for those calls. In Swagger UI, operations with `security: []` ignore the global Authorize token."
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
            success: { type: "boolean", example: true },
            data: { type: "object" },
            error: { type: "string", nullable: true, example: null }
          }
        },
        User: {
          type: "object",
          properties: {
            id: { type: "string", example: "60d0fe4f5311236168a109ca" },
            firstname: { type: "string", example: "John" },
            lastname: { type: "string", example: "Doe" },
            email: { type: "string", example: "john.doe@example.com" },
            isVerified: { type: "boolean", example: true }
          }
        },
        AuthResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            user: { $ref: "#/components/schemas/User" }
          }
        },
        TokenResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" }
          }
        },
        Document: {
          type: "object",
          properties: {
            documentName: { type: "string", example: "Resume" },
            originalFileName: { type: "string", example: "my_resume.pdf" },
            storedFileName: { type: "string", example: "1712345678-my_resume.pdf" },
            uploadDate: { type: "string", format: "date-time" },
            fileUrl: { type: "string", example: "http://localhost:8080/uploads/1712345678-my_resume.pdf" },
            isAdditional: { type: "boolean", example: false },
            isVerified: { type: "boolean", example: true },
            sendToAI: { type: "boolean", example: true }
          }
        },
        Job: {
          type: "object",
          properties: {
            id: { type: "string", example: "60d0fe4f5311236168a109cb" },
            title: { type: "string", example: "Senior Backend Engineer" },
            description: { type: "string", example: "Focus on Node.js and Microservices" },
            status: { type: "string", enum: ["draft", "published", "closed", "archived"], example: "published" },
            unverifiedFilesCount: { type: "number", example: 0 },
            publicId: { type: "string", example: "senior-backend-123" },
            requiredDocuments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  documentType: { type: "string", example: "Resume" },
                  isRequired: { type: "boolean", example: true },
                  sendToAI: { type: "boolean", example: true }
                }
              }
            },
            requirements: {
              type: "object",
              properties: {
                skills: { type: "array", items: { type: "string" }, example: ["Node.js", "TypeScript"] },
                experienceYears: { type: "number", example: 5 },
                location: { type: "string", example: "Kigali, Rwanda" }
              }
            },
            shortlist: { type: "number", example: 75 },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        Applicant: {
          type: "object",
          properties: {
            applicantId: { type: "string", example: "60d0fe4f5311236168a109cc" },
            name: { type: "string", example: "Jane Smith" },
            email: { type: "string", example: "jane.smith@example.com" },
            phoneNumber: { type: "string", example: "+250780000000" },
            dateOfBirth: { type: "string", example: "1995-05-15" },
            status: { type: "string", enum: ["draft", "pending", "shortlisted", "rejected"], example: "pending" },
            jobId: { type: "string", example: "60d0fe4f5311236168a109cb" },
            profileData: {
              type: "object",
              properties: {
                basicInfo: {
                  type: "object",
                  properties: {
                    firstName: { type: "string", example: "Jane" },
                    lastName: { type: "string", example: "Smith" },
                    headline: { type: "string", example: "Full Stack Developer" },
                    bio: { type: "string", example: "Passionate about clean code." },
                    location: { type: "string", example: "London, UK" }
                  }
                },
                skills: { 
                  type: "array", 
                  items: { 
                    type: "object", 
                    properties: { 
                      name: { type: "string", example: "React" }, 
                      level: { type: "string", example: "Expert" }, 
                      yearsOfExperience: { type: "number", example: 4 } 
                    } 
                  } 
                },
                experience: { 
                  type: "array", 
                  items: { 
                    type: "object",
                    properties: {
                      company: { type: "string", example: "Tech Corp" },
                      role: { type: "string", example: "Lead Developer" },
                      startDate: { type: "string" },
                      endDate: { type: "string" },
                      description: { type: "string" }
                    }
                  } 
                }
              }
            },
            documents: { type: "array", items: { $ref: "#/components/schemas/Document" } },
            aiAnalysis: {
              type: "object",
              properties: {
                matchScore: { type: "number", example: 85 },
                rank: { type: "number", example: 1 },
                explanation: {
                  type: "object",
                  properties: {
                    strengths: { type: "array", items: { type: "string" } },
                    gaps: { type: "array", items: { type: "string" } },
                    comment: { type: "string" }
                  }
                }
              }
            },
            createdAt: { type: "string", format: "date-time" }
          }
        },
        Screening: {
          type: "object",
          properties: {
            id: { type: "string" },
            jobId: { type: "string" },
            status: { type: "string", enum: ["pending", "processing", "completed", "failed", "stopped"] },
            progress: {
              type: "object",
              properties: {
                finished: { type: "number" },
                total: { type: "number" }
              }
            },
            stats: {
              type: "object",
              properties: {
                totalApplicants: { type: "number" },
                topScore: { type: "number" },
                shortlistedCount: { type: "number" }
              }
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" }
          }
        },
        Source: {
          type: "object",
          properties: {
            _id: { type: "string", example: "60d0fe4f5311236168a109cd" },
            code: { type: "string", example: "LINKEDIN" },
            name: { type: "string", example: "LinkedIn Ads" },
            deletable: { type: "boolean", example: true }
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
            "201": {
              description: "User registered",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              email: { type: "string" },
                              message: { type: "string" }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
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
          responses: {
            "200": {
              description: "Login success",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/AuthResponse" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
          responses: {
            "200": {
              description: "Returns access + refresh tokens",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/AuthResponse" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
          responses: {
            "200": {
              description: "Token refreshed",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/TokenResponse" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
          responses: {
            "200": {
              description: "Reset initiated",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              sent: { type: "boolean", example: true }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
            "200": {
              description: "Email verified",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              verified: { type: "boolean", example: true },
                              email: { type: "string" }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            },
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
          responses: { 
            "200": { 
              description: "Verification email sent",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              sent: { type: "boolean", example: true }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            } 
          }
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
          responses: {
            "200": {
              description: "Password reset",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              reset: { type: "boolean", example: true }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/auth/me": {
        get: {
          tags: ["Identity Service"],
          summary: "Get profile",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "User Profile",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/User" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
          responses: {
            "200": {
              description: "Profile updated",
              content: { "application/json": { schema: { $ref: "#/components/schemas/ApiResponse" } } }
            }
          }
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
          responses: {
            "200": {
              description: "Password changed",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { type: "object", properties: { changed: { type: "boolean", example: true } } }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/auth/logout": {
        post: {
          tags: ["Identity Service"],
          summary: "Logout current session",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": { 
              description: "Logged out",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              loggedOut: { type: "boolean", example: true }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/auth/logout-all": {
        post: {
          tags: ["Identity Service"],
          summary: "Logout all sessions",
          security: [{ bearerAuth: [] }],
          responses: { 
            "200": { 
              description: "Logged out all",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              loggedOut: { type: "boolean", example: true }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/sources": {
        get: {
          tags: ["Identity Service"],
          summary: "List traffic/candidate sources",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Sources list",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { type: "array", items: { $ref: "#/components/schemas/Source" } }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
          responses: { 
            "201": { 
              description: "Source created; returns full list",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { type: "array", items: { $ref: "#/components/schemas/Source" } }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
          responses: { 
            "200": { 
              description: "Source updated; returns full list",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { type: "array", items: { $ref: "#/components/schemas/Source" } }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/sources/{code}": {
        delete: {
          tags: ["Identity Service"],
          summary: "Delete source",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "code", required: true, schema: { type: "string" } }],
          responses: { 
            "200": { 
              description: "Deleted; returns full list",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { type: "array", items: { $ref: "#/components/schemas/Source" } }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
          responses: { 
            "200": { 
              description: "Public Job Details",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              recruiterId: { type: "string" },
                              publicId: { type: "string" },
                              title: { type: "string" },
                              description: { type: "string" },
                              requirements: { $ref: "#/components/schemas/Job/properties/requirements" },
                              status: { type: "string" },
                              requiredDocuments: { $ref: "#/components/schemas/Job/properties/requiredDocuments" },
                              activeSource: { type: "string", example: "LINKEDIN" }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }, 
            "403": { description: "Invalid source" } 
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
            { in: "query", name: "status", schema: { type: "string", enum: ["draft", "published", "closed", "archived"] } },
            { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
          ],
          responses: {
            "200": {
              description: "Jobs list",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              items: { type: "array", items: { $ref: "#/components/schemas/Job" } },
                              pagination: { type: "object" }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
                    requirements: {
                      type: "object",
                      required: ["skills", "experienceYears", "location"],
                      properties: {
                        skills: { type: "array", items: { type: "string" }, minItems: 1 },
                        experienceYears: { type: "number", minimum: 0 },
                        location: { type: "string", example: "Kigali, Rwanda" }
                      }
                    },
                    shortlist: { type: "number", example: 70 },
                    requiredDocuments: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          documentType: { type: "string", example: "Portfolio" },
                          isRequired: { type: "boolean", example: true },
                          sendToAI: { type: "boolean", example: true }
                        }
                      }
                    },
                    status: { type: "string", enum: ["draft", "published", "closed", "archived"] }
                  }
                }
              }
            }
          },
          responses: { 
            "201": { 
              description: "Created",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Job" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/jobs/{id}": {
        get: {
          tags: ["Job Service"],
          summary: "Get recruiter job by ID",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Job Details",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Job" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        patch: {
          tags: ["Job Service"],
          summary: "Update job",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/Job" } } }
          },
          responses: { 
            "200": { 
              description: "Updated", 
              content: { 
                "application/json": { 
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Job" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        delete: {
          tags: ["Job Service"],
          summary: "Delete job",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { 
            "200": { 
              description: "Deleted",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { type: "object", properties: { deleted: { type: "boolean", example: true } } }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/jobs/{id}/publish": {
        post: {
          tags: ["Job Service"],
          summary: "Publish job",
          description: "Sets status to **published** so the job appears on `GET /public/jobs/{publicId}` and accepts applications.",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { 
            "200": { 
              description: "Published; includes publicUrl",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              jobId: { type: "string" },
                              publicUrl: { type: "string" },
                              status: { type: "string" }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
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
                    ]
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
              description: "Application submitted",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Applicant" }
                        }
                      }
                    ]
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
                    applicant: { type: "string", description: "Full Applicant JSON object (name, email, phoneNumber, profileData)" },
                    files: { type: "array", items: { type: "string", format: "binary" }, description: "Additional docs during verification" }
                  }
                }
              }
            }
          },
          responses: {
            "200": {
              description: "Verified application",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Applicant" }
                        }
                      }
                    ]
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
            { in: "query", name: "source", schema: { type: "string" }, description: "Filter by application source code" },
            { in: "query", name: "needsVerification", schema: { type: "boolean" }, description: "Filter applicants with unverified additional documents" },
            { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
            { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } }
          ],
          responses: { 
            "200": { 
              description: "Applicants list",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              items: { type: "array", items: { $ref: "#/components/schemas/Applicant" } },
                              pagination: { type: "object" }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ["Applicant Service"],
          summary: "Create applicant manually",
          security: [{ bearerAuth: [] }],
          responses: { 
            "201": { 
              description: "Created",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Applicant" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
          responses: { 
            "200": { 
              description: "Applicants for job",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              items: { type: "array", items: { $ref: "#/components/schemas/Applicant" } },
                              pagination: { type: "object" }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/applicant-items/{id}": {
        get: {
          tags: ["Applicant Service"],
          summary: "Get applicant by ID",
          security: [{ bearerAuth: [] }],
          description: "Each `documents[]` entry includes `fileUrl` for opening the file on this API host.",
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Applicant details",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Applicant" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        patch: {
          tags: ["Applicant Service"],
          summary: "Update applicant",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/Applicant" } } }
          },
          responses: {
            "200": {
              description: "Updated applicant",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Applicant" }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        delete: {
          tags: ["Applicant Service"],
          summary: "Delete applicant",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { 
            "200": { 
              description: "Deleted",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { type: "object", properties: { deleted: { type: "boolean", example: true } } }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/applicant-items/{id}/documents/{storedFileName}/verify": {
        patch: {
          tags: ["Applicant Service"],
          summary: "Verify an additional document (Recruiter Only)",
          description: "Marks a specific document as verified. If this is the last unverified additional document for the applicant, it decrements the total count on the job card.",
          security: [{ bearerAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" }, description: "Applicant ID" },
            { in: "path", name: "storedFileName", required: true, schema: { type: "string" }, description: "The unique stored filename of the document" }
          ],
          responses: {
            "200": { 
              description: "Document verified; returns updated applicant object",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { $ref: "#/components/schemas/Applicant" }
                        }
                      }
                    ]
                  }
                }
              }
            },
            "404": { description: "Applicant or Document not found" }
          }
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
          responses: { 
            "200": { 
              description: "Screenings list",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              items: { type: "array", items: { $ref: "#/components/schemas/Screening" } },
                              pagination: { type: "object" }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
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
          responses: {
            "202": {
              description: "Screening Queued",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: { type: "object", properties: { screeningId: { type: "string" }, jobId: { type: "string" } } }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/screenings/{id}/status": {
        get: {
          tags: ["Screening Service"],
          summary: "Get screening status",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: { 
            "200": { 
              description: "Screening Status",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              id: { type: "string" },
                              status: { type: "string" },
                              progress: { 
                                type: "object",
                                properties: {
                                  finished: { type: "number" },
                                  total: { type: "number" }
                                }
                              },
                              updatedAt: { type: "string", format: "date-time" }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        },
        post: {
          tags: ["Screening Service"],
          summary: "Stop a running screening",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Screening stopped" }
          }
        },
        delete: {
          tags: ["Screening Service"],
          summary: "Delete a screening record",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            "200": { description: "Screening deleted" }
          }
        }
      },
      "/screenings/{id}/results": {
        get: {
          tags: ["Screening Service"],
          summary: "Get screening results",
          security: [{ bearerAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            "200": {
              description: "Final AI Screening results",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              totalApplicants: { type: "number" },
                              topScore: { type: "number" },
                              shortlistedCount: { type: "number" },
                              items: { type: "array", items: { $ref: "#/components/schemas/Applicant" } }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      },
      "/dashboard/overview": {
        get: {
          tags: ["Dashboard Service"],
          summary: "Get dashboard overview metrics",
          security: [{ bearerAuth: [] }],
          responses: {
            "200": {
              description: "Overview Metrics",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/ApiResponse" },
                      {
                        type: "object",
                        properties: {
                          data: {
                            type: "object",
                            properties: {
                              summary: {
                                type: "object",
                                properties: {
                                  totalJobs: { type: "number" },
                                  totalApplicants: { type: "number" },
                                  totalScreenings: { type: "number" },
                                  pendingScreenings: { type: "number" },
                                  processingScreenings: { type: "number" },
                                  completedScreenings: { type: "number" },
                                  averageTopScore: { type: "number" },
                                  averageRequiredSkillsPerJob: { type: "number" }
                                }
                              },
                              pipeline: { type: "object" },
                              breakdowns: { type: "object" },
                              jobs: { 
                                type: "object",
                                properties: {
                                  topByApplicants: { type: "array", items: { type: "object" } },
                                  latest: { type: "array", items: { $ref: "#/components/schemas/Job" } }
                                }
                              },
                              recentActivity: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    type: { type: "string" },
                                    timestamp: { type: "string", format: "date-time" },
                                    title: { type: "string" },
                                    jobId: { type: "string" }
                                  }
                                }
                              },
                              alerts: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    severity: { type: "string", enum: ["info", "warning"] },
                                    message: { type: "string" }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    ]
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: []
};

export const swaggerSpec = swaggerJsdoc(swaggerOptions);
