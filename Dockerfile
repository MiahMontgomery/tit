# Use Node.js 18 Alpine for smaller image size
FROM node:18-alpine

# System deps for Puppeteer (already installed Chromium)
RUN apk add --no-cache     chromium     nss     freetype     freetype-dev     harfbuzz     ca-certificates     ttf-freefont

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

# Install deps **including devDependencies** so vite/esbuild are available
COPY package*.json ./
RUN npm ci

# Copy source and create storage
COPY . .
RUN mkdir -p /data/storage

# Build both frontend and backend (vite + server build)
RUN npm run build

EXPOSE 3000
ENV NODE_ENV=production
ENV FILE_STORAGE_DIR=/data/storage

# Healthcheck hits API route (not static)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3   CMD curl -sf http://localhost:3000/api/health || exit 1

CMD ["npm","start"]
