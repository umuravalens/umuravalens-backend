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
<<<<<<< HEAD
WORKDIR /app/apps/auth-service
=======
WORKDIR /app/apps/identity-service
>>>>>>> 13a2fd59e4498a89864e0b9aeafab82269b43c71
EXPOSE 3000
CMD ["npm", "run", "start"]
