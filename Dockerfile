# Use Node.js 20 Alpine for smaller image size
FROM node:20-slim AS builder

# System deps for Puppeteer (already installed Chromium)
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Remove any .env files to prevent Prisma from loading them in production
# Prisma automatically loads .env files which can override environment variables
RUN rm -f .env .env.local .env.*.local 2>/dev/null || true

RUN npx prisma generate

RUN npm run build

FROM node:20-slim AS production
WORKDIR /app
COPY --from=builder /app ./

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000
CMD ["npm", "start"]
