/**
 * Authentication and Authorization Middleware
 * Provides security layer for API endpoints with multi-tenant support
 */

import type { MiddyfiedHandler } from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { UserId, OrganizationId } from '@types';
import { MySQLService } from '@services/index';
import { logger, unauthorized, forbidden, createUnauthorizedError, createAccessDeniedError } from '@utils/index';

// Authentication configuration
interface AuthConfig {
  readonly requireAuth?: boolean;
  readonly requireOrgAccess?: boolean;
  readonly allowedRoles?: readonly string[];
  readonly enableApiKeyAuth?: boolean;
  readonly enableJWTAuth?: boolean;
  readonly skipAuthForPaths?: readonly string[];
}

// User authentication context
export interface AuthContext {
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly userRole: string;
  readonly permissions: readonly string[];
  readonly isAuthenticated: boolean;
  readonly authMethod: 'api_key' | 'jwt' | 'development';
}

// Authentication result
interface AuthResult {
  readonly success: boolean;
  readonly user?: AuthContext;
  readonly error?: string;
}

// Default configuration
const DEFAULT_CONFIG: Required<AuthConfig> = {
  requireAuth: true,
  requireOrgAccess: true,
  allowedRoles: [],
  enableApiKeyAuth: true,
  enableJWTAuth: false, // Not implemented in hackathon scope
  skipAuthForPaths: ['/health/ping']
};

// Authentication middleware factory
export const authenticator = (config: AuthConfig = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const mysqlService = MySQLService.getInstance();

  return {
    before: async (handler: MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult>) => {
      const event = (handler as any).event;
      const requestId = event.requestContext?.requestId || 'unknown';

      try {
        // Skip authentication for excluded paths
        if (finalConfig.skipAuthForPaths.includes(event.path)) {
          logger.debug('Skipping authentication for path', {
            path: event.path,
            requestId
          });
          return;
        }

        if (!finalConfig.requireAuth) {
          logger.debug('Authentication disabled', { requestId });
          return;
        }

        // Attempt authentication
        const authResult = await authenticateRequest(event, finalConfig, mysqlService);

        if (!authResult.success) {
          logger.warn('Authentication failed', {
            requestId,
            path: event.path,
            method: event.httpMethod,
            error: authResult.error,
            sourceIp: event.requestContext?.identity?.sourceIp,
            userAgent: event.headers['User-Agent']
          });

          (handler as any).response = unauthorized(authResult.error || 'Authentication required', requestId);
          return;
        }

        if (!authResult.user) {
          (handler as any).response = unauthorized('Invalid authentication', requestId);
          return;
        }

        // Authorization checks
        const authzResult = await authorizeRequest(event, authResult.user, finalConfig);

        if (!authzResult.success) {
          logger.warn('Authorization failed', {
            requestId,
            userId: authResult.user.userId,
            organizationId: authResult.user.organizationId.toString(),
            path: event.path,
            method: event.httpMethod,
            error: authzResult.error
          });

          (handler as any).response = forbidden(authzResult.error || 'Access denied', requestId);
          return;
        }

        // Store auth context in event for use by handlers
        (event as any).authContext = authResult.user;

        logger.info('Request authenticated and authorized', {
          requestId,
          userId: authResult.user.userId,
          organizationId: authResult.user.organizationId.toString(),
          userRole: authResult.user.userRole,
          authMethod: authResult.user.authMethod,
          path: event.path
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown auth error';

        logger.error('Authentication middleware error', {
          requestId,
          error: errorMessage,
          path: event.path,
          method: event.httpMethod
        });

        (handler as any).response = unauthorized('Authentication system error', requestId);
      }
    }
  };
};

// Authenticate request using available methods
async function authenticateRequest(
  event: APIGatewayProxyEvent,
  config: Required<AuthConfig>,
  mysqlService: MySQLService
): Promise<AuthResult> {
  // Development mode - extract from request body (hackathon only)
  if (process.env.NODE_ENV === 'development' || process.env.STAGE === 'dev') {
    const devAuth = await authenticateFromRequestBody(event, mysqlService);
    if (devAuth.success) {
      return devAuth;
    }
  }

  // API Key authentication
  if (config.enableApiKeyAuth) {
    const apiKeyAuth = await authenticateWithApiKey(event, mysqlService);
    if (apiKeyAuth.success) {
      return apiKeyAuth;
    }
  }

  // JWT authentication (placeholder for future implementation)
  if (config.enableJWTAuth) {
    const jwtAuth = await authenticateWithJWT(event, mysqlService);
    if (jwtAuth.success) {
      return jwtAuth;
    }
  }

  return {
    success: false,
    error: 'No valid authentication method found'
  };
}

// Development authentication from request body (hackathon convenience)
async function authenticateFromRequestBody(
  event: APIGatewayProxyEvent,
  mysqlService: MySQLService
): Promise<AuthResult> {
  try {
    if (!event.body) {
      return { success: false, error: 'No request body for development auth' };
    }

    const body = JSON.parse(event.body);
    if (!body.userId || !body.organizationId) {
      return { success: false, error: 'Missing userId or organizationId in request body' };
    }

    // Validate user exists and has access to organization
    const userResult = await mysqlService.getUserData(body.userId, body.organizationId);

    if (!userResult.success || !userResult.data) {
      return {
        success: false,
        error: `User ${body.userId} not found or not authorized for organization ${body.organizationId}`
      };
    }

    const user = userResult.data;

    return {
      success: true,
      user: {
        userId: user.id,
        organizationId: user.organization_id,
        userRole: user.role,
        permissions: ['read', 'write'], // Simplified for hackathon
        isAuthenticated: true,
        authMethod: 'development'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid request body format for development auth'
    };
  }
}

// API Key authentication
async function authenticateWithApiKey(
  event: APIGatewayProxyEvent,
  mysqlService: MySQLService
): Promise<AuthResult> {
  const apiKey = event.headers['X-Api-Key'] || event.headers['x-api-key'];

  if (!apiKey) {
    return { success: false, error: 'Missing API key' };
  }

  // In a real implementation, you would:
  // 1. Query database for API key
  // 2. Validate key is active
  // 3. Extract user/organization info from key
  // 4. Check key permissions

  // Placeholder implementation for hackathon
  if (apiKey === 'dev-api-key-12345') {
    return {
      success: true,
      user: {
        userId: 'api-user-1',
        organizationId: 1,
        userRole: 'API_USER',
        permissions: ['read', 'write'],
        isAuthenticated: true,
        authMethod: 'api_key'
      }
    };
  }

  return { success: false, error: 'Invalid API key' };
}

// JWT authentication (placeholder)
async function authenticateWithJWT(
  event: APIGatewayProxyEvent,
  mysqlService: MySQLService
): Promise<AuthResult> {
  const authHeader = event.headers['Authorization'] || event.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { success: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.substring(7);

  // Placeholder - in real implementation you would:
  // 1. Verify JWT signature
  // 2. Check expiration
  // 3. Extract user claims
  // 4. Validate user exists and is active

  return { success: false, error: 'JWT authentication not implemented' };
}

// Authorize request based on user context and requirements
async function authorizeRequest(
  event: APIGatewayProxyEvent,
  user: AuthContext,
  config: Required<AuthConfig>
): Promise<AuthResult> {
  // Check role-based authorization
  if (config.allowedRoles.length > 0) {
    if (!config.allowedRoles.includes(user.userRole)) {
      return {
        success: false,
        error: `Role ${user.userRole} not authorized. Required: ${config.allowedRoles.join(', ')}`
      };
    }
  }

  // Check organization access for specific requests
  if (config.requireOrgAccess) {
    const orgAccessResult = await checkOrganizationAccess(event, user);
    if (!orgAccessResult.success) {
      return orgAccessResult;
    }
  }

  // Check resource-specific permissions
  const resourceAccessResult = await checkResourceAccess(event, user);
  if (!resourceAccessResult.success) {
    return resourceAccessResult;
  }

  return { success: true };
}

// Check organization access for multi-tenant requests
async function checkOrganizationAccess(
  event: APIGatewayProxyEvent,
  user: AuthContext
): Promise<AuthResult> {
  // Extract organization ID from request
  let requestedOrgId: number | null = null;

  // Check request body
  if (event.body) {
    try {
      const body = JSON.parse(event.body);
      if (body.organizationId) {
        requestedOrgId = body.organizationId;
      }
    } catch {
      // Ignore JSON parsing errors
    }
  }

  // Check query parameters
  if (!requestedOrgId && event.queryStringParameters?.organizationId) {
    requestedOrgId = parseInt(event.queryStringParameters.organizationId, 10);
  }

  // Check path parameters
  if (!requestedOrgId && event.pathParameters?.organizationId) {
    requestedOrgId = parseInt(event.pathParameters.organizationId, 10);
  }

  // If organization ID is specified in request, verify access
  if (requestedOrgId && requestedOrgId !== user.organizationId) {
    return {
      success: false,
      error: `Access denied to organization ${requestedOrgId}. User belongs to organization ${user.organizationId}`
    };
  }

  return { success: true };
}

// Check resource-specific access permissions
async function checkResourceAccess(
  event: APIGatewayProxyEvent,
  user: AuthContext
): Promise<AuthResult> {
  const method = event.httpMethod.toUpperCase();
  const path = event.path;

  // Define resource permissions
  const resourcePermissions: Record<string, { read?: boolean; write?: boolean }> = {
    '/compliance/ask': { write: true },
    '/compliance/history': { read: true },
    '/compliance/conversation': { read: true },
    '/health/ping': { read: true }
  };

  // Check if user has required permissions for the resource
  for (const [resourcePath, requiredPermissions] of Object.entries(resourcePermissions)) {
    if (path.startsWith(resourcePath)) {
      if (requiredPermissions.write && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        if (!user.permissions.includes('write')) {
          return {
            success: false,
            error: `Write access required for ${resourcePath}`
          };
        }
      }

      if (requiredPermissions.read && method === 'GET') {
        if (!user.permissions.includes('read')) {
          return {
            success: false,
            error: `Read access required for ${resourcePath}`
          };
        }
      }
      break;
    }
  }

  return { success: true };
}

// Export convenience middleware instances
export const defaultAuth = authenticator();

export const developmentAuth = authenticator({
  requireAuth: true,
  requireOrgAccess: true,
  allowedRoles: [], // Allow all roles in development
  enableApiKeyAuth: true,
  enableJWTAuth: false
});

export const productionAuth = authenticator({
  requireAuth: true,
  requireOrgAccess: true,
  allowedRoles: ['CISO', 'COMPLIANCE_OFFICER', 'IT_ADMINISTRATOR', 'SECURITY_ANALYST', 'AUDITOR', 'EXECUTIVE', 'USER'],
  enableApiKeyAuth: true,
  enableJWTAuth: false
});

export const readOnlyAuth = authenticator({
  requireAuth: true,
  requireOrgAccess: true,
  allowedRoles: []
});

// Helper function to get auth context from event
export function getAuthContext(event: APIGatewayProxyEvent): AuthContext | null {
  return (event as any).authContext || null;
}
