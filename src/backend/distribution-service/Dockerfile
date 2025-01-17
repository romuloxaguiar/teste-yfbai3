# Stage 1: Build
FROM mcr.microsoft.com/dotnet/sdk:6.0-alpine AS builder
# v6.0.419 - Latest LTS Alpine SDK image for .NET 6.0

WORKDIR /src

# Copy project file first for layer caching
COPY ["DistributionService.csproj", "./"]
RUN dotnet restore "DistributionService.csproj" \
    --runtime alpine-x64

# Copy everything else
COPY . .

# Build and publish
RUN dotnet build "DistributionService.csproj" -c Release -o /app/build \
    && dotnet publish "DistributionService.csproj" \
    -c Release \
    -o /app/publish \
    --no-restore \
    --runtime alpine-x64 \
    --self-contained true \
    /p:PublishTrimmed=true \
    /p:PublishSingleFile=true

# Stage 2: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:6.0-alpine
# v6.0.25 - Latest LTS Alpine runtime image for ASP.NET Core 6.0

# Create non-root user and group
RUN addgroup -S app && adduser -S app -G app

# Set working directory
WORKDIR /app

# Copy published files from builder
COPY --from=builder /app/publish .

# Set ownership
RUN chown -R app:app /app

# Configure environment variables
ENV ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_RUNNING_IN_CONTAINER=true \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 \
    ASPNETCORE_URLS=http://+:80

# Create and configure data volume
VOLUME ["/app/data"]
RUN chown -R app:app /app/data

# Expose port
EXPOSE 80/tcp

# Switch to non-root user
USER app:app

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:80/health || exit 1

# Set read-only filesystem
RUN chmod 555 /app

# Drop all capabilities and only add necessary ones
RUN setcap 'cap_net_bind_service=+ep' /app/DistributionService

# Labels
LABEL maintainer="AMS Team" \
      service="distribution-service" \
      version="1.0.0" \
      technology=".NET 6.0" \
      component="email-distribution"

# Set entry point
ENTRYPOINT ["./DistributionService"]