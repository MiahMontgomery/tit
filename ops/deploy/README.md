# Deployment instructions

This directory contains scripts and documentation for deploying Titan to your production server (e.g., modeliv.com).

## Prerequisites

- Ubuntu 22.04 or later
- Docker Engine and docker compose plugin installed
- The `/opt/titan` directory on the server is writable by the deploy user
- Environment files `ops/env/api.env` and `ops/env/worker.env` are present on the server (not committed to the repository)

## Deployment process

The `deploy.sh` script syncs the `docker-compose.prod.yml` and Caddy configuration to the server, builds and runs the containers, and cleans up unused images. Run this script on the server with:

    ./deploy.sh

Ensure that environment variables are set up correctly before running the script. For GitHub Actions deployment, see `.github/workflows/deploy.yml`.
