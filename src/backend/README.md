# Automated Meeting Minutes System - Backend Services

Enterprise-grade backend services for automated processing and generation of meeting minutes from Microsoft Teams transcriptions.

## Overview

The backend system implements a microservices architecture for processing Teams meeting transcriptions into structured, actionable meeting minutes using AI-powered analysis.

### Architecture

- **API Gateway**: Routes and secures API requests using Azure API Management
- **Transcription Service**: Processes Teams meeting transcriptions
- **AI Engine**: Performs NLP analysis for topic extraction and action item detection
- **Document Service**: Generates formatted meeting minutes
- **Distribution Service**: Handles email delivery of minutes

### Technologies

- Node.js 16.x with TypeScript
- Python 3.9 for AI services
- Docker + Kubernetes (AKS)
- Azure Cloud Services
- MongoDB for operational data
- Redis for caching

### Performance Targets

- Processing Time: < 5 minutes post-meeting
- Accuracy: > 95% content accuracy
- Distribution: 100% delivery within 10 minutes
- Scalability: Support for 1000+ concurrent meetings

## Getting Started

### Prerequisites

- Node.js >= 16.0.0
- Python >= 3.9.0
- Docker Desktop
- Azure CLI
- Kubernetes CLI (kubectl)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/organization/automated-meeting-minutes
cd automated-meeting-minutes/src/backend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start development environment:
```bash
npm run docker:up
```

### Environment Configuration

Required environment variables:
```
# Azure Configuration
AZURE_TENANT_ID=<tenant_id>
AZURE_CLIENT_ID=<client_id>
AZURE_CLIENT_SECRET=<client_secret>

# API Configuration
API_PORT=3000
CORS_ORIGIN=*
LOG_LEVEL=info

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/meeting_minutes
REDIS_URL=redis://localhost:6379

# AI Engine Configuration
MODEL_PATH=/app/models
CUDA_VISIBLE_DEVICES=all
```

## Development

### Local Development

1. Start services individually:
```bash
npm run dev:services
```

2. Run with hot reload:
```bash
npm run dev
```

3. Access services:
- API Gateway: http://localhost:3000
- AI Engine: http://localhost:8000
- Monitoring: http://localhost:3001

### Testing

Run comprehensive test suite:
```bash
npm run test:all        # All tests
npm run test:unit      # Unit tests only
npm run test:integration # Integration tests
```

### Security

- Authentication: Azure AD OAuth 2.0
- Authorization: Role-based access control (RBAC)
- Data Encryption: AES-256 at rest, TLS 1.3 in transit
- Security Scanning: 
```bash
npm run security:audit
```

### Monitoring

- Application Insights integration
- Prometheus metrics
- Grafana dashboards
- Custom health checks

## Services

### API Gateway

- Rate limiting: 1000 requests/minute/client
- Circuit breaker pattern implementation
- Request validation and sanitization
- Swagger documentation at /api/docs

### AI Engine

- BERT-based topic detection
- RoBERTa action item recognition
- BART text summarization
- GPU acceleration support
- Batch processing optimization

### Document Service

- Template-based document generation
- PDF and HTML output formats
- Metadata enrichment
- Version control

### Distribution Service

- Reliable email delivery
- Retry mechanisms
- Delivery tracking
- Template management

### Transcription Service

- Real-time Teams integration
- Speech artifact removal
- Speaker diarization
- Noise reduction

## Operations

### Deployment

Production deployment via Azure Pipelines:
```bash
# Build and push containers
npm run docker:build

# Deploy to AKS
kubectl apply -f k8s/
```

### Scaling

- Horizontal pod autoscaling
- Vertical scaling for AI workloads
- Redis cluster for caching
- MongoDB sharding

### Monitoring

Access monitoring dashboards:
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090
- Application Insights

### Disaster Recovery

- Geographic replication
- Automated backups
- Failover testing
- Recovery point objective (RPO): 5 minutes
- Recovery time objective (RTO): 10 minutes

## Available Scripts

- `npm run build`: Build all TypeScript services
- `npm run test`: Run test suite with coverage
- `npm run docker:up`: Start development environment
- `npm run docker:down`: Stop development environment
- `npm run security:audit`: Run security audit
- `npm run monitor:services`: Start monitoring dashboard

## Contributing

1. Branch naming convention: `feature/`, `bugfix/`, `hotfix/`
2. Commit message format: `type(scope): description`
3. Required checks before PR:
   - Linting: `npm run lint`
   - Tests: `npm run test`
   - Security: `npm run security:audit`

## License

Proprietary - All rights reserved

## Support

Contact enterprise support:
- Email: support@organization.com
- Slack: #meeting-minutes-support