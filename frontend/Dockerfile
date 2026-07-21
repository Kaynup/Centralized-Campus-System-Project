# frontend/Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Multi-stage build:
#   Stage 1 (builder)  — node:22-alpine  → runs `npm ci` + `vite build`
#   Stage 2 (serve)    — nginx:alpine    → serves the static dist/ directory
#
# Build context: frontend/
#
# VITE_ env vars are baked into the bundle at build time via ARGs.
# Pass them through docker-compose `build.args` or `--build-arg` on the CLI.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cache friendly — only re-runs on lockfile change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy application source (node_modules excluded via .dockerignore)
COPY . .

# Build-time environment variables that Vite bakes into the JS bundle.
# These must be the publicly-accessible host URLs (seen by the browser),
# NOT Docker-internal service names.
ARG VITE_API_BASE_URL=http://localhost:8000
ARG VITE_AUTH_API=http://localhost:8000
ARG VITE_EQUIPMENT_API=http://localhost:8001
ARG VITE_FACILITY_API=http://localhost:8002
ARG VITE_MARKETPLACE_API=http://localhost:8003
ARG VITE_WS_BASE_URL=ws://localhost:8003

# Write a fresh .env so Vite picks up the ARGs (overrides any .env.local)
RUN printf "VITE_API_BASE_URL=%s\n\
VITE_AUTH_API=%s\n\
VITE_EQUIPMENT_API=%s\n\
VITE_FACILITY_API=%s\n\
VITE_MARKETPLACE_API=%s\n\
VITE_WS_BASE_URL=%s\n" \
  "$VITE_API_BASE_URL" "$VITE_AUTH_API" \
  "$VITE_EQUIPMENT_API" "$VITE_FACILITY_API" \
  "$VITE_MARKETPLACE_API" "$VITE_WS_BASE_URL" > .env

RUN npm run build


# ── Stage 2: Serve ──────────────────────────────────────────────────────────
FROM nginx:alpine

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Use our custom nginx config (SPA routing + gzip + asset caching)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
