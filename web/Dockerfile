# build
FROM node:20-bullseye AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
ENV VITE_API_BASE="https://tit-heaw.onrender.com"
# Build frontend only (not server/worker) and output to dist/ for static site
ENV STATIC_SITE_BUILD=true
RUN npm run build:static

# serve
FROM nginx:1.27-alpine
# Copy from dist/ (not dist/public) since STATIC_SITE_BUILD=true outputs there
COPY --from=build /app/dist /usr/share/nginx/html
# push api requests to proxy at /api
COPY ./nginx/web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
