/**
 * HTTP response utilities for Lambda functions
 * Provides consistent response formatting with proper types
 */

import type { APIResponse, AppError } from '@types/index';
import logger from './logger';

// Standard HTTP headers for CORS and content type
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Api-Key',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block'
} as const;

// Success response builder
export const success = <T>(
  data: T,
  statusCode: number = 200,
  headers: Record<string, string> = {}
): APIResponse<T> => {
  const responseHeaders = { ...DEFAULT_HEADERS, ...headers };

  logger.info('Successful response', {
    statusCode,
    dataType: typeof data
  });

  return {
    statusCode,
    body: JSON.stringify({
      success: true,
      data,
      timestamp: new Date().toISOString()
    }),
    headers: responseHeaders
  };
};

// Error response builder
export const error = (
  appError: AppError,
  headers: Record<string, string> = {}
): APIResponse => {
  const responseHeaders = { ...DEFAULT_HEADERS, ...headers };

  logger.error('Error response', {
    errorCode: appError.code,
    statusCode: appError.statusCode,
    message: appError.message,
    context: appError.context
  });

  return {
    statusCode: appError.statusCode,
    body: JSON.stringify({
      success: false,
      error: {
        code: appError.code,
        message: appError.message,
        timestamp: appError.timestamp,
        requestId: appError.requestId
      }
    }),
    headers: responseHeaders
  };
};

// Validation error response
export const validationError = (
  message: string,
  field?: string,
  requestId?: string
): APIResponse => {
  logger.warn('Validation error', { message, field, requestId });

  return {
    statusCode: 400,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        field,
        timestamp: new Date().toISOString(),
        requestId
      }
    }),
    headers: DEFAULT_HEADERS
  };
};

// Not found response
export const notFound = (
  resource: string,
  resourceId: string,
  requestId?: string
): APIResponse => {
  const message = `${resource} not found: ${resourceId}`;

  logger.warn('Resource not found', {
    resource,
    resourceId,
    requestId
  });

  return {
    statusCode: 404,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message,
        resource,
        resourceId,
        timestamp: new Date().toISOString(),
        requestId
      }
    }),
    headers: DEFAULT_HEADERS
  };
};

// Unauthorized response
export const unauthorized = (
  message: string = 'Unauthorized access',
  requestId?: string
): APIResponse => {
  logger.security('Unauthorized access attempt', {
    message,
    requestId
  });

  return {
    statusCode: 401,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message,
        timestamp: new Date().toISOString(),
        requestId
      }
    }),
    headers: DEFAULT_HEADERS
  };
};

// Forbidden response
export const forbidden = (
  message: string = 'Access forbidden',
  requestId?: string
): APIResponse => {
  logger.security('Forbidden access attempt', {
    message,
    requestId
  });

  return {
    statusCode: 403,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message,
        timestamp: new Date().toISOString(),
        requestId
      }
    }),
    headers: DEFAULT_HEADERS
  };
};

// Internal server error response
export const internalServerError = (
  message: string = 'Internal server error',
  requestId?: string
): APIResponse => {
  logger.error('Internal server error', {
    message,
    requestId
  });

  return {
    statusCode: 500,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message,
        timestamp: new Date().toISOString(),
        requestId
      }
    }),
    headers: DEFAULT_HEADERS
  };
};

// Service unavailable response
export const serviceUnavailable = (
  serviceName: string,
  requestId?: string
): APIResponse => {
  const message = `Service temporarily unavailable: ${serviceName}`;

  logger.error('Service unavailable', {
    serviceName,
    requestId
  });

  return {
    statusCode: 503,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message,
        service: serviceName,
        timestamp: new Date().toISOString(),
        requestId
      }
    }),
    headers: DEFAULT_HEADERS
  };
};

// Timeout response
export const timeout = (
  operation: string,
  timeoutMs: number,
  requestId?: string
): APIResponse => {
  const message = `Operation timed out: ${operation} (${timeoutMs}ms)`;

  logger.error('Operation timeout', {
    operation,
    timeoutMs,
    requestId
  });

  return {
    statusCode: 504,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'TIMEOUT',
        message,
        operation,
        timeoutMs,
        timestamp: new Date().toISOString(),
        requestId
      }
    }),
    headers: DEFAULT_HEADERS
  };
};

// Rate limit exceeded response
export const rateLimitExceeded = (
  limit: number,
  retryAfter: number,
  requestId?: string
): APIResponse => {
  const message = `Rate limit exceeded. Limit: ${limit} requests. Try again in ${retryAfter} seconds.`;

  logger.warn('Rate limit exceeded', {
    limit,
    retryAfter,
    requestId
  });

  return {
    statusCode: 429,
    body: JSON.stringify({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        limit,
        retryAfter,
        timestamp: new Date().toISOString(),
        requestId
      }
    }),
    headers: {
      ...DEFAULT_HEADERS,
      'Retry-After': retryAfter.toString()
    }
  };
};
