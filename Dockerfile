# Multi-stage Dockerfile for Production Deployment
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Image
FROM node:20-slim

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./
COPY --from=builder /app/database.js ./
COPY --from=builder /app/electoral.db ./

EXPOSE 5000

CMD ["node", "server.js"]
