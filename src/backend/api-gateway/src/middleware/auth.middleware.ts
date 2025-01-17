/**
 * @fileoverview Authentication middleware for API Gateway with Azure AD B2C integration
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ConfidentialClientApplication, Configuration, LogLevel } from '@azure/msal-node'; // ^2.1.0
import jwt, { JwtPayload, TokenExpiredError, JsonWebKeySet } from 'jsonwebtoken'; // ^9.0.0
import { ErrorCode } from '../../../shared/constants/error-codes';
import { handleError } from '../../../shared/utils/error-handler';
import Redis from 'redis'; // ^4.6.0

// Authentication constants
const TOKEN_EXPIRY = 3600; // 1 hour in seconds
const AUTH_HEADER = 'Authorization';
const BEARER_PREFIX = 'Bearer ';
const MAX_TOKEN_AGE = 86400; // 24 hours in seconds
const RATE_LIMIT_WINDOW = 60000; // 1 minute in milliseconds
const MAX_REQUESTS_PER_WINDOW = 100;

/**
 * Token validation parameters interface
 */
interface TokenValidationParams {
  issuer: string;
  audience: string;
  clockTolerance: number;
  maxAge: number;
}

/**
 * Token claims interface with user context
 */
interface TokenClaims extends JwtPayload {
  sub: string;
  roles?: string[];
  scopes?: string[];
  name?: string;
  email?: string;
}

/**
 * Authentication configuration interface
 */
interface AuthConfig {
  issuer: string;
  audience: string;
  clockTolerance?: number;
  maxAge?: number;
  redisConfig?: {
    host: string;
    port: number;
    password?: string;
  };
}

/**
 * Authentication middleware class for Azure AD B2C integration
 */
export class AuthMiddleware {
  private msalClient: ConfidentialClientApplication;
  private validationParams: TokenValidationParams;
  private tokenCache: Redis.RedisClientType;
  private jwks: JsonWebKeySet;

  constructor(
    private clientId: string,
    private clientSecret: string,
    private tenantId: string,
    private config: AuthConfig
  ) {
    // Initialize MSAL client
    const msalConfig: Configuration = {
      auth: {
        clientId: this.clientId,
        clientSecret: this.clientSecret,
        authority: `https://login.microsoftonline.com/${this.tenantId}`,
      },
      system: {
        loggerOptions: {
          logLevel: LogLevel.Warning,
          piiLoggingEnabled: false,
        },
      },
    };

    this.msalClient = new ConfidentialClientApplication(msalConfig);

    // Set token validation parameters
    this.validationParams = {
      issuer: config.issuer,
      audience: config.audience,
      clockTolerance: config.clockTolerance || 300, // 5 minutes
      maxAge: config.maxAge || MAX_TOKEN_AGE,
    };

    // Initialize Redis cache if configured
    if (config.redisConfig) {
      this.tokenCache = Redis.createClient(config.redisConfig);
      this.tokenCache.connect().catch(err => {
        handleError(new Error(`Redis connection failed: ${err.message}`));
      });
    }

    // Initialize JWKS
    this.refreshJwks().catch(err => {
      handleError(new Error(`JWKS refresh failed: ${err.message}`));
    });
  }

  /**
   * Refresh JWKS from Azure AD
   */
  private async refreshJwks(): Promise<void> {
    try {
      const response = await fetch(
        `https://login.microsoftonline.com/${this.tenantId}/discovery/v2.0/keys`
      );
      this.jwks = await response.json();
    } catch (error) {
      throw new Error(`Failed to refresh JWKS: ${error.message}`);
    }
  }

  /**
   * Validate JWT token and extract claims
   */
  private async validateToken(token: string): Promise<TokenClaims> {
    try {
      // Check token revocation in cache
      if (this.tokenCache) {
        const isRevoked = await this.tokenCache.get(`revoked:${token}`);
        if (isRevoked) {
          throw new Error('Token has been revoked');
        }
      }

      // Verify token signature and claims
      const decoded = jwt.verify(token, this.jwks, {
        algorithms: ['RS256'],
        issuer: this.validationParams.issuer,
        audience: this.validationParams.audience,
        clockTolerance: this.validationParams.clockTolerance,
        maxAge: this.validationParams.maxAge,
      }) as TokenClaims;

      return decoded;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new Error('Token has expired');
      }
      throw error;
    }
  }
}

/**
 * Authentication middleware for token validation
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.header(AUTH_HEADER);
    if (!authHeader?.startsWith(BEARER_PREFIX)) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.slice(BEARER_PREFIX.length);
    if (!token) {
      throw new Error('No token provided');
    }

    // Get instance of AuthMiddleware (assuming singleton pattern)
    const authMiddleware = req.app.get('authMiddleware') as AuthMiddleware;
    const claims = await authMiddleware.validateToken(token);

    // Enrich request with user context
    req.user = {
      id: claims.sub,
      roles: claims.roles || [],
      scopes: claims.scopes || [],
      name: claims.name,
      email: claims.email,
    };

    next();
  } catch (error) {
    const serviceError = await handleError(error, {
      errorCode: ErrorCode.UNAUTHORIZED,
      source: 'auth.middleware',
    });
    res.status(401).json({ error: serviceError });
  }
};

/**
 * Scope validation middleware
 */
export const validateScope = (requiredScopes: string[]): RequestHandler => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userScopes = req.user?.scopes || [];
      const hasRequiredScopes = requiredScopes.every(scope => 
        userScopes.includes(scope)
      );

      if (!hasRequiredScopes) {
        throw new Error('Insufficient scope');
      }

      next();
    } catch (error) {
      const serviceError = await handleError(error, {
        errorCode: ErrorCode.FORBIDDEN,
        source: 'auth.middleware',
      });
      res.status(403).json({ error: serviceError });
    }
  };
};

export default AuthMiddleware;