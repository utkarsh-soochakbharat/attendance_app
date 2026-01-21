# Use Node.js 20 LTS
FROM node:20-slim

# Install build dependencies for better-sqlite3
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Set npm to install correct optional binaries for Linux x64
ENV npm_config_arch=x64 \
    npm_config_platform=linux

# Install dependencies (include devDependencies for Vite build) with explicit arch/platform
RUN npm install --arch=x64 --platform=linux
# Explicitly install Rollup native binary required by Vite
RUN npm install @rollup/rollup-linux-x64-gnu

# Copy all source files
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


