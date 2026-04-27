<<<<<<< HEAD
# Builder stage
FROM node:20-alpine AS builder
WORKDIR /app

# System deps for native modules
RUN apk add --no-cache python3 make g++

# Copy workspace config & source
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

# Install all deps
RUN npm install

# Build each micro‑service explicitly (this also compiles shared packages into apps/*/dist/packages)
RUN npm run build -w @umurava/api-gateway && \
    npm run build -w @umurava/identity-service && \
    npm run build -w @umurava/job-service && \
    npm run build -w @umurava/applicant-service && \
    npm run build -w @umurava/worker-service && \
    npm run build -w @umurava/screening-service && \
    npm run build -w @umurava/notification-service

# Copy compiled shared packages back to their source folders so they can be resolved by node
# (The apps built them into their own dist folders because of rootDir: "../../")
RUN cp -r apps/api-gateway/dist/packages/* packages/

# Verify that every service produced a dist/ folder (helps catch silent build failures)
RUN echo "=== Verifying build output ===" && \
    ls -la apps/api-gateway/dist && \
    ls -la apps/identity-service/dist && \
    ls -la apps/job-service/dist && \
    ls -la apps/applicant-service/dist && \
    ls -la apps/worker-service/dist && \
    ls -la apps/screening-service/dist && \
    ls -la apps/notification-service/dist || true

# Runtime stage
FROM node:20-alpine
WORKDIR /app

# Copy the full built workspace (including all dist/ folders) from builder
COPY --from=builder /app /app

ENV NODE_ENV=production

# Expose all backend ports
EXPOSE 8090 8091 8092 8093 8094 8095 8096

# Start all services concurrently (uses the root package.json script)
CMD ["npm", "run", "start"]
=======
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN apk add --no-cache python3 make g++
RUN npm ci
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app /app
ENV NODE_ENV=production
# All workspace dist/ folders are compiled and available under /app
>>>>>>> 13a2fd59e4498a89864e0b9aeafab82269b43c71
