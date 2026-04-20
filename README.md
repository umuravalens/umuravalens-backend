# UmuravaLens Backend

Production-ready microservices backend for the UmuravaLens recruitment platform, implemented with Node.js, TypeScript, Express, MongoDB, Redis/BullMQ, JWT authentication, and Socket.io notifications.

## Features

- Microservices architecture with API Gateway
- Authentication with bcrypt + JWT
- Jobs and applicants management
- CSV and PDF upload support (no AI processing)
- Screening workflow with queue-driven processing
- Deterministic applicant ranking (skills + experience)
- Real-time screening status updates via Socket.io
- Shared packages for consistent types and utilities
- Dockerized deployment with `docker-compose`

## Services

- `api-gateway` - Entry point and routing/proxy layer
- `auth-service` - Register/login and token generation
- `job-service` - CRUD for jobs
- `applicant-service` - Manual applicants, CSV import, PDF upload metadata
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

### Auth
- `POST /auth/register`
- `GET /auth/verify-email?token=...`
- `POST /auth/login`
- `POST /auth/refresh-token`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/me` (Bearer token required)
- `POST /auth/logout` (Bearer token required)
- `POST /auth/logout-all` (Bearer token required)

### Jobs
- `POST /jobs` (Bearer token required)
- `GET /jobs` (Bearer token required, recruiter-owned jobs only)
- `GET /jobs/:id` (Bearer token required, recruiter-owned job only)
- `PATCH /jobs/:id` (Bearer token required)
- `DELETE /jobs/:id` (Bearer token required)
- `POST /jobs/:id/publish` (Bearer token required; sets job to published)
- `GET /public/jobs/:publicId` (public job details for applicants)

### Applicants
- `POST /applicants` (Bearer token required)
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

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

(Windows PowerShell)

```powershell
Copy-Item .env.example .env
```

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
npm run dev --workspaces
```

Make sure MongoDB and Redis are available and `.env` is configured.

## Notes

- No AI logic or external AI APIs are included.
- Architecture is AI-ready: screening workflow can later be extended with AI ranking providers behind worker strategies.
- Logging is implemented with Winston via `@umurava/shared-utils`.
- Global error handlers are implemented in each API service.
