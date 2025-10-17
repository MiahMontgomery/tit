#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/opt/titan"
mkdir -p "$APP_DIR"
rsync -az --delete \
  docker-compose.prod.yml \
  ops/caddy/Caddyfile \
  "$APP_DIR/"

# build on server for caching speed (or pull from registry if you prefer)
docker compose -f "$APP_DIR/docker-compose.prod.yml" pull || true
docker compose -f "$APP_DIR/docker-compose.prod.yml" build --no-cache
docker compose -f "$APP_DIR/docker-compose.prod.yml" up -d --remove-orphans
docker system prune -f
