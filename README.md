# UmuravaLens Backend

Production-ready microservices backend for the UmuravaLens recruitment platform, implemented with Node.js, TypeScript, Express, MongoDB, Redis/BullMQ, JWT authentication, and Socket.io notifications.

## Features

- Microservices architecture with API Gateway
- Authentication with bcrypt + JWT (Identity Service)
- Jobs and applicants management
- **AI-Powered Resume Analysis** (Gemini AI integration)
- Screening workflow with queue-driven processing
- Deterministic applicant ranking (skills + experience)
- Real-time screening status updates via Socket.io
- Shared packages for consistent types and utilities
- Dockerized deployment with `docker-compose`
- Source-first monorepo architecture for high-speed development

## Services

- `api-gateway` - Entry point and routing/proxy layer
- `identity-service` - User accounts, profile, and candidate source management
- `job-service` - CRUD for jobs
- `applicant-service` - AI resume analysis, applications intake, and candidate verification
- `screening-service` - Screening orchestration and status/results APIs
- `worker-service` - BullMQ consumer for screening processing
- `notification-service` - Socket.io event broadcasting and internal event ingestion

## Architecture

```text
Client
  -> API Gateway
      -> Auth Service
      -> Job Service
      -> Applicant Service
      -> Screening Service -> Redis/BullMQ -> Worker Service
                                               -> Job Service
                                               -> Applicant Service
                                               -> Notification Service (HTTP /events)
                                                        -> Socket.io clients

MongoDB stores domain data per service DB.
```

## Data Model

### User
- `name`
- `email`
- `passwordHash`

### Job
- `title`
- `description`
- `requirements.skills[]`
- `requirements.experience`

### Applicant
- `jobId`
- `name`
- `email`
- `skills[]`
- `experienceYears`
- `resumeUrl`

### Screening
- `jobId`
- `status` (`pending`, `processing`, `completed`)
- `results[]` (`applicantId`, `rank`, `score`, `notes`)

## Queue

- Redis + BullMQ
- Queue name: `screening-queue`
- Retry policy: 3 attempts
- Worker simulates processing and computes ranking

## Real-time Events

Notification service emits:
- `screening_started`
- `screening_processing`
- `screening_completed`

Socket endpoint: `ws://localhost:8085`

## API Documentation

All external calls go through API Gateway (`http://localhost:8080`).
Interactive Swagger UI is available at `http://localhost:8080/docs`.

### Identity
- `POST /identity/login` - Local authentication
- `POST /identity/google` - Social authentication (OAuth 2.0)
- `POST /identity/refresh-token`
- `POST /identity/forgot-password`
- `POST /identity/reset-password`
- `GET /identity/me` (Bearer token required)
- `PATCH /identity/me` (Update profiles)
- `PATCH /identity/change-password`
- `POST /identity/logout` 
- `POST /identity/logout-all`
- `GET /sources` - List candidate traffic sources (Bearer token required)
- `POST /sources` - Add new source code (e.g. LINKEDIN)

### Jobs
- `POST /jobs` (Bearer token required)
- `GET /jobs` (Bearer token required, recruiter-owned jobs only)
- `GET /jobs/:id` (Bearer token required, recruiter-owned job only)
- `PATCH /jobs/:id` (Bearer token required)
- `DELETE /jobs/:id` (Bearer token required)
- `POST /jobs/:id/publish` (Bearer token required; sets job to published)
- `GET /public/jobs/:publicId` (public job details for applicants)

### Applicants
- `POST /applicants/analyze` - AI Resume parsing (Multipart PDF; Bearer token required)
- `POST /applicants/apply` - Submit standard application (JSON; Bearer token required)
- `POST /applicants/verify/:applicantId` - Verify candidate (Bearer token required)
- `POST /applicants` (Manual creation; Bearer token required)
- `GET /applicants` (Bearer token required, optional query: `jobId`)
- `POST /public/jobs/:publicId/apply` (public application: multipart fields + optional `files`; no auth)
- `GET /uploads/:filename` (serve uploaded file; use `documents[].fileUrl` from applicant responses; no auth)
- `GET /applicants/:jobId` (Bearer token required)
- `GET /applicant-items/:id` (Bearer token required)
- `PATCH /applicant-items/:id` (Bearer token required)
- `DELETE /applicant-items/:id` (Bearer token required)

### Screening
- `POST /screenings/run` (Bearer token required; body: `{ "jobId": "..." }`)
- `GET /screenings` (Bearer token required; optional query: `jobId`, `status`)
- `GET /screenings/:id/status` (Bearer token required)
- `GET /screenings/:id/results` (Bearer token required)

### Dashboard
- `GET /dashboard/overview` (Bearer token required)

## Standard Response Format

Every API responds using:

```json
{
  "success": true,
  "data": {},
  "error": null
}
```

Error shape:

```json
{
  "success": false,
  "data": null,
  "error": "message"
}
```

## Setup

### 1) Create environment file
 
Copy the sample config to the root directory:
 
```bash
cp .env.example .env
```
 
(Windows PowerShell)
 
```powershell
Copy-Item .env.example .env
```
*Note: A single `.env` at the root now configures all microservices.*

### 2) Run with Docker Compose

```bash
docker-compose up --build
```

This starts:
- MongoDB
- Redis
- All seven services

### 3) Health checks

- Gateway: `GET http://localhost:8080/health`
- Auth: `GET http://localhost:8081/health`
- Jobs: `GET http://localhost:8082/health`
- Applicants: `GET http://localhost:8083/health`
- Screening: `GET http://localhost:8084/health`
- Notifications: `GET http://localhost:8085/health`

## Local Development (without Docker)
 
```bash
npm install
npm run dev
```
 
Make sure MongoDB and Redis are available. The project uses `tsx watch --env-file .env` for high-speed hot-reloading across the entire monorepo.

## Notes

- **AI Integration**: Google Gemini AI is integrated for automated resume parsing in the `applicant-service`.
- **Monorepo Architecture**: Uses NPM Workspaces. Shared packages (`shared-types`, `shared-utils`) are consumed directly from source during development.
- **Logging**: Implemented with Winston via `@umurava/shared-utils`, including full error stack serialization.
- **Global error handlers**: Implemented in each API service and the Gateway.
