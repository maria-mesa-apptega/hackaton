/**
 * Error types and interfaces for comprehensive error handling
 * Follows domain-driven design patterns for error management
 */

import type { UserId, OrganizationId } from './common.types';

// Error codes enum for type safety
export enum ErrorCode {
  // Validation errors (400)
  INVALID_REQUEST = 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_USER_ID = 'INVALID_USER_ID',
  INVALID_ORGANIZATION_ID = 'INVALID_ORGANIZATION_ID',
  QUESTION_TOO_SHORT = 'QUESTION_TOO_SHORT',
  QUESTION_TOO_LONG = 'QUESTION_TOO_LONG',

  // Authentication/Authorization errors (401/403)
  UNAUTHORIZED = 'UNAUTHORIZED',
  ACCESS_DENIED = 'ACCESS_DENIED',
  INVALID_API_KEY = 'INVALID_API_KEY',
  USER_NOT_IN_ORGANIZATION = 'USER_NOT_IN_ORGANIZATION',

  // Not found errors (404)
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  ORGANIZATION_NOT_FOUND = 'ORGANIZATION_NOT_FOUND',
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',

  // Business logic errors (422)
  ORGANIZATION_INACTIVE = 'ORGANIZATION_INACTIVE',
  USER_SUSPENDED = 'USER_SUSPENDED',
  COMPLIANCE_DATA_INCOMPLETE = 'COMPLIANCE_DATA_INCOMPLETE',

  // Rate limiting (429)
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // External service errors (502/503)
  BEDROCK_SERVICE_ERROR = 'BEDROCK_SERVICE_ERROR',
  MYSQL_CONNECTION_ERROR = 'MYSQL_CONNECTION_ERROR',
  DYNAMODB_SERVICE_ERROR = 'DYNAMODB_SERVICE_ERROR',
  ONE_API_SERVICE_ERROR = 'ONE_API_SERVICE_ERROR',
  WEB_API_SERVICE_ERROR = 'WEB_API_SERVICE_ERROR',

  // Internal errors (500)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  AI_PROCESSING_ERROR = 'AI_PROCESSING_ERROR',

  // Timeout errors (504)
  REQUEST_TIMEOUT = 'REQUEST_TIMEOUT',
  BEDROCK_TIMEOUT = 'BEDROCK_TIMEOUT',
  DATABASE_TIMEOUT = 'DATABASE_TIMEOUT'
}

// Base error interface
export interface BaseError {
  readonly name: string;
  readonly code: ErrorCode;
  readonly message: string;
  readonly statusCode: number;
  readonly timestamp: string;
  readonly requestId?: string;
  readonly context?: Record<string, unknown>;
}

// Specific error types for better type safety
export interface ValidationError extends BaseError {
  readonly code:
    | ErrorCode.INVALID_REQUEST
    | ErrorCode.MISSING_REQUIRED_FIELD
    | ErrorCode.INVALID_USER_ID
    | ErrorCode.INVALID_ORGANIZATION_ID
    | ErrorCode.QUESTION_TOO_SHORT
    | ErrorCode.QUESTION_TOO_LONG;
  readonly statusCode: 400;
  readonly field?: string;
  readonly expectedFormat?: string;
}

export interface AuthenticationError extends BaseError {
  readonly code:
    | ErrorCode.UNAUTHORIZED
    | ErrorCode.INVALID_API_KEY;
  readonly statusCode: 401;
}

export interface AuthorizationError extends BaseError {
  readonly code:
    | ErrorCode.ACCESS_DENIED
    | ErrorCode.USER_NOT_IN_ORGANIZATION;
  readonly statusCode: 403;
  readonly userId?: UserId;
  readonly organizationId?: OrganizationId;
}

export interface NotFoundError extends BaseError {
  readonly code:
    | ErrorCode.USER_NOT_FOUND
    | ErrorCode.ORGANIZATION_NOT_FOUND
    | ErrorCode.CONVERSATION_NOT_FOUND;
  readonly statusCode: 404;
  readonly resourceId: string;
  readonly resourceType: string;
}

export interface BusinessLogicError extends BaseError {
  readonly code:
    | ErrorCode.ORGANIZATION_INACTIVE
    | ErrorCode.USER_SUSPENDED
    | ErrorCode.COMPLIANCE_DATA_INCOMPLETE;
  readonly statusCode: 422;
}

export interface RateLimitError extends BaseError {
  readonly code: ErrorCode.RATE_LIMIT_EXCEEDED;
  readonly statusCode: 429;
  readonly retryAfter: number; // seconds
  readonly limit: number;
  readonly remaining: number;
}

export interface ExternalServiceError extends BaseError {
  readonly code:
    | ErrorCode.BEDROCK_SERVICE_ERROR
    | ErrorCode.MYSQL_CONNECTION_ERROR
    | ErrorCode.DYNAMODB_SERVICE_ERROR
    | ErrorCode.ONE_API_SERVICE_ERROR
    | ErrorCode.WEB_API_SERVICE_ERROR;
  readonly statusCode: 502 | 503;
  readonly serviceName: string;
  readonly originalError?: string;
}

export interface InternalServerError extends BaseError {
  readonly code:
    | ErrorCode.INTERNAL_SERVER_ERROR
    | ErrorCode.CONFIGURATION_ERROR
    | ErrorCode.DATABASE_ERROR
    | ErrorCode.AI_PROCESSING_ERROR;
  readonly statusCode: 500;
  readonly stack?: string;
}

export interface TimeoutError extends BaseError {
  readonly code:
    | ErrorCode.REQUEST_TIMEOUT
    | ErrorCode.BEDROCK_TIMEOUT
    | ErrorCode.DATABASE_TIMEOUT;
  readonly statusCode: 504;
  readonly timeoutMs: number;
}

// Union type for all possible errors
export type AppError =
  | ValidationError
  | AuthenticationError
  | AuthorizationError
  | NotFoundError
  | BusinessLogicError
  | RateLimitError
  | ExternalServiceError
  | InternalServerError
  | TimeoutError;

// Error factory interface for creating typed errors
export interface ErrorFactory {
  validation: (code: ValidationError['code'], message: string, field?: string) => ValidationError;
  authentication: (code: AuthenticationError['code'], message: string) => AuthenticationError;
  authorization: (
    code: AuthorizationError['code'],
    message: string,
    userId?: UserId,
    organizationId?: OrganizationId
  ) => AuthorizationError;
  notFound: (
    code: NotFoundError['code'],
    message: string,
    resourceId: string,
    resourceType: string
  ) => NotFoundError;
  businessLogic: (code: BusinessLogicError['code'], message: string) => BusinessLogicError;
  rateLimit: (
    message: string,
    retryAfter: number,
    limit: number,
    remaining: number
  ) => RateLimitError;
  externalService: (
    code: ExternalServiceError['code'],
    message: string,
    serviceName: string,
    statusCode?: 502 | 503
  ) => ExternalServiceError;
  internalServer: (
    code: InternalServerError['code'],
    message: string,
    stack?: string
  ) => InternalServerError;
  timeout: (
    code: TimeoutError['code'],
    message: string,
    timeoutMs: number
  ) => TimeoutError;
}

// Error context for additional debugging information
export interface ErrorContext {
  readonly userId?: UserId;
  readonly organizationId?: OrganizationId;
  readonly requestPath?: string;
  readonly userAgent?: string;
  readonly ip?: string;
  readonly functionName?: string;
  readonly stage?: string;
  readonly region?: string;
  readonly timestamp: string;
  readonly correlationId?: string;
}
