# Stage 1: Builder stage for compiling dependencies
FROM python:3.9-slim AS builder

# Set build arguments and environment variables
ARG DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    python3-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /build

# Copy requirements and setup files
COPY requirements.txt setup.py ./

# Install dependencies with version pinning
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir torch==2.0.0 --index-url https://download.pytorch.org/whl/cu118

# Copy source code
COPY src/ ./src/

# Build Python package with optimizations
RUN pip install --no-cache-dir -e .

# Stage 2: Final runtime stage
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu22.04

# Set environment variables
ENV PYTHONPATH=/app \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    CUDA_VISIBLE_DEVICES=all \
    TF_FORCE_GPU_ALLOW_GROWTH=true \
    TF_CPP_MIN_LOG_LEVEL=2 \
    MODEL_PATH=/app/models \
    LOG_LEVEL=INFO

# Install Python and runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.9 \
    python3-pip \
    python3-setuptools \
    && rm -rf /var/lib/apt/lists/*

# Create nonroot user for security
RUN groupadd -r nonroot && \
    useradd -r -g nonroot -s /sbin/nologin nonroot && \
    mkdir -p /app /app/models && \
    chown -R nonroot:nonroot /app

# Set working directory
WORKDIR /app

# Copy built package and dependencies from builder
COPY --from=builder /build /app
COPY --from=builder /usr/local/lib/python3.9/site-packages /usr/local/lib/python3.9/site-packages

# Configure GPU memory management
ENV NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility \
    NVIDIA_REQUIRE_CUDA="cuda>=11.8"

# Setup logging and monitoring
RUN mkdir -p /app/logs && \
    chown -R nonroot:nonroot /app/logs

# Switch to nonroot user
USER nonroot

# Expose service port
EXPOSE 8000

# Configure health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl --fail http://localhost:8000/health || exit 1

# Set entrypoint
ENTRYPOINT ["python3", "-m", "src.main"]

# Set default command
CMD ["--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Security hardening
LABEL maintainer="Enterprise Development Team" \
      version="1.0.0" \
      description="AI Engine for Automated Meeting Minutes System" \
      security.capabilities="drop-all"

# Add metadata labels
LABEL org.opencontainers.image.source="https://github.com/organization/automated-meeting-minutes" \
      org.opencontainers.image.licenses="Proprietary" \
      org.opencontainers.image.vendor="Enterprise Organization" \
      org.opencontainers.image.version="1.0.0" \
      org.opencontainers.image.title="AI Engine" \
      org.opencontainers.image.description="AI-powered meeting transcription processing service"