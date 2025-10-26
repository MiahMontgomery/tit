# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine

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

# Generate Prisma client
RUN npx prisma generate

# Build both frontend and backend (vite + server build)
RUN npm run build

EXPOSE 3000
ENV PORT=3000
CMD ["npm", "start"]
