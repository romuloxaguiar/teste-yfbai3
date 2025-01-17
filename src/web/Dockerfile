# Build stage
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files first to leverage Docker layer caching
COPY package*.json ./

# Install dependencies using clean install for consistent builds
# Use ci instead of install for more reliable builds
RUN npm ci

# Copy source files
COPY . .

# Build application with production optimization
ENV NODE_ENV=production
RUN npm run build

# Create non-root user and set permissions
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /app/dist

# Production stage
FROM nginx:1.25-alpine

# Copy custom nginx configuration for SPA support
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create non-root user for nginx
RUN addgroup -S appgroup && adduser -S appuser -G appgroup \
    && chown -R appuser:appgroup /usr/share/nginx/html \
    && chown -R appuser:appgroup /var/cache/nginx \
    && chown -R appuser:appgroup /var/log/nginx \
    && chown -R appuser:appgroup /etc/nginx/conf.d \
    && touch /var/run/nginx.pid \
    && chown -R appuser:appgroup /var/run/nginx.pid

# Configure nginx security headers and worker processes
RUN sed -i 's/worker_processes  auto/worker_processes  4/' /etc/nginx/nginx.conf \
    && echo "add_header X-Frame-Options DENY;" >> /etc/nginx/conf.d/default.conf \
    && echo "add_header X-Content-Type-Options nosniff;" >> /etc/nginx/conf.d/default.conf \
    && echo "add_header X-XSS-Protection \"1; mode=block\";" >> /etc/nginx/conf.d/default.conf \
    && echo "add_header Referrer-Policy strict-origin-when-cross-origin;" >> /etc/nginx/conf.d/default.conf \
    && echo "add_header Content-Security-Policy \"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';\";" >> /etc/nginx/conf.d/default.conf

# Remove unnecessary files and packages
RUN rm -rf /usr/share/nginx/html/index.html.br \
    && rm -rf /usr/share/nginx/html/index.html.gz \
    && apk del alpine-sdk \
    && rm -rf /var/cache/apk/*

# Expose port 80
EXPOSE 80

# Switch to non-root user
USER appuser

# Start nginx
CMD ["nginx", "-g", "daemon off;"]