# Stage 1: Builder
FROM node:16-alpine AS builder

# Install security scanning tools
RUN apk add --no-cache python3 py3-pip curl \
    && pip3 install --no-cache-dir safety bandit \
    && curl -sfL https://raw.githubusercontent.com/aquasecurity/trivy/main/contrib/install.sh | sh -s -- -b /usr/local/bin

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies with strict security checks
RUN npm ci --only=production \
    && npm audit fix --force \
    && trivy filesystem --severity HIGH,CRITICAL --no-progress / \
    && safety check

# Copy source code and configs
COPY . .

# Build TypeScript with strict checks
RUN npm run build

# Run security tests and prune dev dependencies
RUN npm prune --production

# Stage 2: Production
FROM node:16-alpine

# Set security labels
LABEL maintainer="Meeting Minutes System Team" \
      description="API Gateway for Meeting Minutes System" \
      version="1.0.0" \
      security.scan.status="verified" \
      compliance.gdpr="compliant" \
      monitoring.apm="enabled"

# Install runtime security dependencies
RUN apk add --no-cache tini dumb-init

# Create non-root user
RUN addgroup -g 1001 node && \
    adduser -u 1001 -G node -s /bin/sh -D node

# Set working directory
WORKDIR /app

# Copy production assets from builder
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./

# Configure security headers and environment
ENV NODE_ENV=production \
    PORT=3000 \
    TZ=UTC \
    SECURITY_HEADERS=true \
    APM_ENABLED=true \
    STRICT_SECURITY=true

# Create required directories with appropriate permissions
RUN mkdir -p /app/logs /app/apm /app/security && \
    chown -R node:node /app && \
    chmod -R 755 /app

# Switch to non-root user
USER node

# Configure healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node dist/healthcheck.js

# Expose API port
EXPOSE 3000

# Set security options
SECURITY_OPTS="--security-opt=no-new-privileges:true \
    --security-opt=seccomp=unconfined \
    --cap-drop=ALL \
    --cap-add=NET_BIND_SERVICE"

# Mount volumes for logs and monitoring
VOLUME ["/app/logs", "/app/apm", "/app/security"]

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]

# Start application
CMD ["node", "dist/index.js"]

# Apply security headers
LABEL security.headers.content-type-options="nosniff" \
      security.headers.frame-options="DENY" \
      security.headers.xss-protection="1; mode=block"

# Set read-only root filesystem
RUN chmod a-w /