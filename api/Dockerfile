# --- build stage ---
FROM node:20-bullseye AS build
WORKDIR /app
COPY package*.json ./
# keep devDependencies so vite/tsc exist
RUN npm ci --ignore-scripts
COPY . .
# optional: if using tsc
RUN npm run build

# --- runtime stage ---
FROM node:20-bullseye AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts
COPY --from=build /app/dist ./dist
# if you need runtime assets (prisma schema, migrations, etc.) copy them here
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","--enable-source-maps","dist/server/index.js"]
