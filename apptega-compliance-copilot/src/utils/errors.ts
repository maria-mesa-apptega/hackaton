/**
 * Error factory for creating typed application errors
 * Implements factory pattern for consistent error creation
 */

import type {
  ErrorFactory,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  BusinessLogicError,
  RateLimitError,
  ExternalServiceError,
  InternalServerError,
  TimeoutError,
  UserId,
  OrganizationId
} from '@types/index';
import { ErrorCode } from '@types/index';

// Helper function to generate request ID if not provided
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
};

// Helper function to get current timestamp
const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};

// Error factory implementation
class ErrorFactoryImpl implements ErrorFactory {
  public validation(
    code: ValidationError['code'],
    message: string,
    field?: string,
    requestId?: string
  ): ValidationError {
    return {
      code,
      message,
      statusCode: 400,
      timestamp: getCurrentTimestamp(),
      requestId: requestId ?? generateRequestId(),
      field,
      context: field ? { field } : undefined
    };
  }

  public authentication(
    code: AuthenticationError['code'],
    message: string,
    requestId?: string
  ): AuthenticationError {
    return {
      code,
      message,
      statusCode: 401,
      timestamp: getCurrentTimestamp(),
      requestId: requestId ?? generateRequestId()
    };
  }

  public authorization(
    code: AuthorizationError['code'],
    message: string,
    userId?: UserId,
    organizationId?: OrganizationId,
    requestId?: string
  ): AuthorizationError {
    return {
      code,
      message,
      statusCode: 403,
      timestamp: getCurrentTimestamp(),
      requestId: requestId ?? generateRequestId(),
      userId,
      organizationId,
      context: (userId || organizationId) ? { userId, organizationId } : undefined
    };
  }

  public notFound(
    code: NotFoundError['code'],
    message: string,
    resourceId: string,
    resourceType: string,
    requestId?: string
  ): NotFoundError {
    return {
      code,
      message,
      statusCode: 404,
      timestamp: getCurrentTimestamp(),
      requestId: requestId ?? generateRequestId(),
      resourceId,
      resourceType,
      context: { resourceId, resourceType }
    };
  }

  public businessLogic(
    code: BusinessLogicError['code'],
    message: string,
    requestId?: string
  ): BusinessLogicError {
    return {
      code,
      message,
      statusCode: 422,
      timestamp: getCurrentTimestamp(),
      requestId: requestId ?? generateRequestId()
    };
  }

  public rateLimit(
    message: string,
    retryAfter: number,
    limit: number,
    remaining: number,
    requestId?: string
  ): RateLimitError {
    return {
      code: ErrorCode.RATE_LIMIT_EXCEEDED,
      message,
      statusCode: 429,
      timestamp: getCurrentTimestamp(),
      requestId: requestId ?? generateRequestId(),
      retryAfter,
      limit,
      remaining,
      context: { retryAfter, limit, remaining }
    };
  }

  public externalService(
    code: ExternalServiceError['code'],
    message: string,
    serviceName: string,
    statusCode: 502 | 503 = 502,
    originalError?: string,
    requestId?: string
  ): ExternalServiceError {
    return {
      code,
      message,
      statusCode,
      timestamp: getCurrentTimestamp(),
      requestId: requestId ?? generateRequestId(),
      serviceName,
      originalError,
      context: { serviceName, originalError }
    };
  }

  public internalServer(
    code: InternalServerError['code'],
    message: string,
    stack?: string,
    requestId?: string
  ): InternalServerError {
    return {
      code,
      message,
      statusCode: 500,
      timestamp: getCurrentTimestamp(),
      requestId: requestId ?? generateRequestId(),
      stack,
      context: stack ? { stack } : undefined
    };
  }

  public timeout(
    code: TimeoutError['code'],
    message: string,
    timeoutMs: number,
    requestId?: string
  ): TimeoutError {
    return {
      code,
      message,
      statusCode: 504,
      timestamp: getCurrentTimestamp(),
      requestId: requestId ?? generateRequestId(),
      timeoutMs,
      context: { timeoutMs }
    };
  }
}

// Singleton instance
export const errorFactory = new ErrorFactoryImpl();

// Convenience functions for commonly used errors
export const createValidationError = (
  message: string,
  field?: string,
  requestId?: string
): ValidationError => {
  return errorFactory.validation(ErrorCode.INVALID_REQUEST, message, field, requestId);
};

export const createUserNotFoundError = (
  userId: string,
  requestId?: string
): NotFoundError => {
  return errorFactory.notFound(
    ErrorCode.USER_NOT_FOUND,
    `User not found: ${userId}`,
    userId,
    'User',
    requestId
  );
};

export const createOrganizationNotFoundError = (
  organizationId: string,
  requestId?: string
): NotFoundError => {
  return errorFactory.notFound(
    ErrorCode.ORGANIZATION_NOT_FOUND,
    `Organization not found: ${organizationId}`,
    organizationId,
    'Organization',
    requestId
  );
};

export const createUnauthorizedError = (
  message: string = 'Authentication required',
  requestId?: string
): AuthenticationError => {
  return errorFactory.authentication(ErrorCode.UNAUTHORIZED, message, requestId);
};

export const createAccessDeniedError = (
  userId: UserId,
  organizationId: OrganizationId,
  requestId?: string
): AuthorizationError => {
  return errorFactory.authorization(
    ErrorCode.ACCESS_DENIED,
    'Access denied for this organization',
    userId,
    organizationId,
    requestId
  );
};

export const createBedrockServiceError = (
  originalError: string,
  requestId?: string
): ExternalServiceError => {
  return errorFactory.externalService(
    ErrorCode.BEDROCK_SERVICE_ERROR,
    'AI service is currently unavailable',
    'AWS Bedrock',
    502,
    originalError,
    requestId
  );
};

export const createMySQLConnectionError = (
  originalError: string,
  requestId?: string
): ExternalServiceError => {
  return errorFactory.externalService(
    ErrorCode.MYSQL_CONNECTION_ERROR,
    'Database connection failed',
    'MySQL',
    503,
    originalError,
    requestId
  );
};

export const createDynamoDBServiceError = (
  originalError: string,
  requestId?: string
): ExternalServiceError => {
  return errorFactory.externalService(
    ErrorCode.DYNAMODB_SERVICE_ERROR,
    'Conversation storage is currently unavailable',
    'DynamoDB',
    503,
    originalError,
    requestId
  );
};

export const createTimeoutError = (
  operation: string,
  timeoutMs: number,
  requestId?: string
): TimeoutError => {
  return errorFactory.timeout(
    ErrorCode.REQUEST_TIMEOUT,
    `Operation timed out: ${operation}`,
    timeoutMs,
    requestId
  );
};

export const createInternalServerError = (
  message: string = 'An unexpected error occurred',
  stack?: string,
  requestId?: string
): InternalServerError => {
  return errorFactory.internalServer(
    ErrorCode.INTERNAL_SERVER_ERROR,
    message,
    stack,
    requestId
  );
};
