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

# Install dependencies
RUN npm ci --only=production

# Copy server files
COPY server.js ./

# Create data directory for database
RUN mkdir -p /app/data/faces /app/data/photos

# Expose port (Fly.io will set PORT env var)
EXPOSE 3000

# Set environment variable for database path
ENV DATABASE_PATH=/app/data/ovms.db
ENV NODE_ENV=production

# Start server
CMD ["node", "server.js"]


