# Build stage
FROM node:16-alpine AS builder

# Set working directory
WORKDIR /usr/src/app

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./

# Install dependencies including dev dependencies for building
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Run tests
RUN npm run test

# Clean up dev dependencies
RUN npm prune --production && \
    apk del .build-deps

# Production stage
FROM node:16-alpine

# Set working directory
WORKDIR /usr/src/app

# Install production dependencies
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Copy built files from builder stage
COPY --from=builder /usr/src/app/dist ./dist

# Set secure file permissions
RUN chown -R node:node /usr/src/app && \
    chmod -R 644 /usr/src/app && \
    find /usr/src/app -type d -exec chmod 755 {} + && \
    chmod -R 444 /usr/src/app/node_modules

# Use non-root user
USER node

# Configure environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    NODE_OPTIONS="--max-old-space-size=2048"

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node dist/health-check.js

# Create and configure volumes
VOLUME ["/usr/src/app/node_modules", "/tmp"]

# Expose service port
EXPOSE 3000

# Set security options
RUN addgroup -S appgroup && \
    adduser -S -G appgroup node && \
    chmod -R 444 /usr/src/app/node_modules && \
    chmod -R 755 /usr/src/app/dist

# Drop all capabilities and prevent privilege escalation
USER node
SECURITY_OPT no-new-privileges=true

# Start application
CMD ["node", "dist/index.js"]