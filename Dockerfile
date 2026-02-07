# Use Node.js 20 LTS (bullseye for better compatibility)
FROM node:20-bullseye

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy ONLY package files first (for better Docker layer caching)
COPY package*.json ./

# Install dependencies INSIDE Docker (Linux build)
# This ensures better-sqlite3 is compiled for Linux, not Windows
RUN npm install

# Explicitly install Rollup native binary (fixes npm optional dependencies bug)
RUN npm install @rollup/rollup-linux-x64-gnu --save-optional || true

# Copy rest of application files (node_modules is excluded via .dockerignore)
COPY . .

# Build frontend (Vite)
ENV VITE_SKIP_ELECTRON=true
RUN npx vite build

# Create data directory for database
RUN mkdir -p /app/data/faces /app/data/photos /app/data/voices

# Expose port (Fly.io will set PORT env var)
EXPOSE 3000

# Set environment variable for database path
ENV DATABASE_PATH=/app/data/ovms.db
ENV NODE_ENV=production

# Start server
CMD ["node", "server.js"]











