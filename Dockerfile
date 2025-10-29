# Use Node.js 20 Alpine for smaller image size
FROM node:20-slim AS builder

# System deps for Puppeteer (already installed Chromium)
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-slim AS production
WORKDIR /app
COPY --from=builder /app ./

ENV NODE_ENV=production
ENV PORT=10000

EXPOSE 10000
CMD ["npm", "start"]
