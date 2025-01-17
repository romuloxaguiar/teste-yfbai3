# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies including development tools
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Run tests and security audit
RUN npm run test && \
    npm audit

# Production stage
FROM node:18-alpine

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    LOG_LEVEL=info \
    METRICS_ENABLED=true \
    MAX_HEAP_SIZE=2048m

# Create non-root user
RUN addgroup -g 1000 node && \
    adduser -u 1000 -G node -s /bin/sh -D node

# Set working directory
WORKDIR /app

# Copy package files for production dependencies
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Configure security permissions and ownership
RUN chown -R node:node /app && \
    chmod -R 500 /app && \
    chmod -R 700 /app/node_modules

# Create and configure volume directories
RUN mkdir -p /tmp && \
    chown -R node:node /tmp && \
    chmod 700 /tmp

# Switch to non-root user
USER node

# Expose service port
EXPOSE 3000

# Set up health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Configure security options
RUN apk add --no-cache dumb-init

# Set entry point with security wrapper
ENTRYPOINT ["dumb-init", "--"]

# Define startup command with memory limits
CMD ["node", "--max-old-space-size=2048", "dist/index.js"]

# Apply security labels
LABEL org.opencontainers.image.source="https://github.com/organization/repo" \
      org.opencontainers.image.description="Document service for Automated Meeting Minutes System" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.vendor="Organization" \
      org.opencontainers.image.licenses="Proprietary" \
      security.alpha.kubernetes.io/seccomp-profile="runtime/default" \
      security.alpha.kubernetes.io/capabilities="drop=ALL"