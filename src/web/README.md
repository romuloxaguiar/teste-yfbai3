# Automated Meeting Minutes System - Web Frontend

## Project Overview

The web frontend for the Automated Meeting Minutes System provides a seamless Microsoft Teams-integrated interface for managing automated meeting documentation. This application handles real-time transcription controls, meeting status monitoring, and minutes distribution through a modern, accessible, and responsive user interface.

## Architecture

### Technology Stack
- React 18 with TypeScript 4.9
- Vite 4.0 for development and building
- Microsoft Teams SDK for Teams integration
- Microsoft Fluent UI for Teams-aligned components
- Redux Toolkit for state management
- React Query for API data fetching
- Jest and Testing Library for testing

### Key Features
- Real-time meeting transcription controls
- Processing status monitoring
- Minutes generation and distribution interface
- Teams-native UI components
- Responsive design for all devices
- WCAG 2.1 Level AA accessibility compliance

## Prerequisites

- Node.js >= 16.0.0
- npm >= 8.0.0
- Microsoft Teams development account
- Azure AD application registration
- Valid SSL certificate for local development

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd src/web
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
```

4. Update `.env` with required values:
```env
VITE_TEAMS_CLIENT_ID=your_client_id
VITE_API_BASE_URL=your_api_url
VITE_AUTH_ENDPOINT=your_auth_endpoint
```

## Development

### Available Commands

```bash
# Start development server
npm run dev

# Run unit tests
npm test

# Run end-to-end tests
npm run test:e2e

# Type checking
npm run typecheck

# Lint code
npm run lint

# Format code
npm run format

# Build for production
npm run build

# Preview production build
npm run preview
```

### Development Server

The development server runs on `https://localhost:3000` by default. HTTPS is required for Teams integration.

### Code Organization

```
src/
├── components/     # Reusable UI components
├── features/      # Feature-specific components and logic
├── hooks/         # Custom React hooks
├── services/      # API and external service integrations
├── store/         # Redux store configuration
├── styles/        # Global styles and themes
├── types/         # TypeScript type definitions
└── utils/         # Utility functions
```

## UI Components

### Teams Integration Components

- Meeting Controls
- Status Indicators
- Processing Overlay
- Completion Notifications
- Distribution Interface

### Accessibility Features

- ARIA labels and landmarks
- Keyboard navigation support
- Screen reader optimization
- High contrast mode support
- Focus management
- Color contrast compliance

### Responsive Design

- Mobile-first approach
- Breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px

## Teams Integration

### Setup

1. Register application in Azure AD
2. Configure Teams SDK credentials
3. Add required permissions
4. Configure redirect URIs

### Authentication Flow

1. Teams SSO initialization
2. Azure AD authentication
3. Token acquisition
4. API authorization

## Testing

### Unit Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage
```

Coverage requirements:
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### End-to-End Testing

```bash
# Run e2e tests
npm run test:e2e
```

## Building

### Production Build

```bash
# Create production build
npm run build
```

Build output location: `dist/`

### Build Optimization

- Code splitting
- Tree shaking
- Asset optimization
- Minification
- Source maps generation

## Deployment

### Production Deployment

1. Create production build
2. Configure environment variables
3. Deploy to hosting platform
4. Update Teams application manifest

### Environment Configuration

Required environment variables:
```env
NODE_ENV=production
VITE_TEAMS_CLIENT_ID=prod_client_id
VITE_API_BASE_URL=prod_api_url
VITE_AUTH_ENDPOINT=prod_auth_endpoint
```

## Security

### Best Practices

- Secure authentication implementation
- API request encryption
- XSS prevention
- CSRF protection
- Content Security Policy
- Secure cookie configuration

### Configuration

```typescript
// security.config.ts
export const securityConfig = {
  contentSecurityPolicy: true,
  xssProtection: true,
  noSniff: true,
  frameguard: true
};
```

## Contributing

### Development Standards

- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Git commit conventions
- Pull request templates
- Code review requirements

### Documentation

- Component documentation
- API documentation
- Type definitions
- Security considerations
- Deployment procedures

## License

Copyright © 2023 Automated Meeting Minutes System. All rights reserved.