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
# Persisted at runtime via docker-compose volume; ensure directory exists in image too.
RUN mkdir -p /app/apps/applicant-service/src/uploads
WORKDIR /app/apps/applicant-service
EXPOSE 8083
CMD ["npm", "run", "start"]
