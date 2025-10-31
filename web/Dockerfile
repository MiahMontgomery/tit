# build
FROM node:20-bullseye AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
COPY . .
ENV VITE_API_BASE="https://tit-heaw.onrender.com"
RUN npm run build

# serve
FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
# push api requests to proxy at /api
COPY ./nginx/web.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
