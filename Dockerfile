# ==========================================
# OmniStream HD Video Downloader Production Image
# Multi-stage build with Node.js, Python, yt-dlp, and ffmpeg
# ==========================================

FROM node:22-bullseye-slim AS base

# Install system dependencies: Python3, ffmpeg, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    ffmpeg \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install latest standalone yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install npm dependencies
RUN npm ci

# Copy application sources
COPY . .

# Build frontend production bundle
RUN npm run build

# Create scratch directory for downloads
RUN mkdir -p /app/downloads_scratch && chmod 777 /app/downloads_scratch

# Expose server port
EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV SCRATCH_DIR=/app/downloads_scratch

# Start server
CMD ["node", "--loader", "tsx", "server.ts"]
