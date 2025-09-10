/**
 * Logging Middleware using Winston and Middy
 * Provides comprehensive request/response logging with performance tracking
 */

import type { MiddyfiedHandler } from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult, Context } from 'aws-lambda';
import { logger, API_CONSTANTS, MONITORING_CONSTANTS } from '@utils/index';

// Logging configuration
interface LoggingConfig {
  readonly logRequests?: boolean;
  readonly logResponses?: boolean;
  readonly logErrors?: boolean;
  readonly logPerformance?: boolean;
  readonly sanitizeHeaders?: readonly string[];
  readonly maxBodyLength?: number;
  readonly includeUserInfo?: boolean;
}

// Request information for logging
interface RequestInfo {
  readonly requestId: string;
  readonly method: string;
  readonly path: string;
  readonly userAgent?: string;
  readonly sourceIp?: string;
  readonly userId?: string;
  readonly organizationId?: number;
  readonly bodyLength?: number;
  readonly queryParams?: Record<string, string | null>;
  readonly pathParams?: Record<string, string | null>;
}

// Response information for logging
interface ResponseInfo {
  readonly statusCode: number;
  readonly bodyLength: number;
  readonly processingTime: number;
  readonly success: boolean;
}

// Performance metrics
interface PerformanceMetrics {
  readonly requestId: string;
  readonly processingTime: number;
  readonly memoryUsed?: number;
  readonly coldStart?: boolean;
  readonly functionName?: string;
  readonly isSlowRequest: boolean;
  readonly isErrorRequest: boolean;
}

// Default configuration
const DEFAULT_CONFIG: Required<LoggingConfig> = {
  logRequests: true,
  logResponses: true,
  logErrors: true,
  logPerformance: true,
  sanitizeHeaders: ['authorization', 'x-api-key', 'cookie'],
  maxBodyLength: 1000,
  includeUserInfo: true
};

// Logging middleware factory
export const requestLogger = (config: LoggingConfig = {}) => {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return {
    before: async (handler: MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult>) => {
      const startTime = Date.now();
      const event = handler.event;
      const context = handler.context;

      // Store start time for performance calculation
      (handler as any).__startTime = startTime;

      if (finalConfig.logRequests) {
        const requestInfo = extractRequestInfo(event, context, finalConfig);

        logger.info('Incoming request', {
          ...requestInfo,
          timestamp: new Date(startTime).toISOString(),
          awsRequestId: context.awsRequestId,
          functionName: context.functionName,
          functionVersion: context.functionVersion
        });
      }

      // Add correlation ID to headers if not present
      if (!event.headers[API_CONSTANTS.HEADERS.CORRELATION_ID]) {
        event.headers[API_CONSTANTS.HEADERS.CORRELATION_ID] =
          event.requestContext?.requestId || `req_${startTime}_${Math.random().toString(36).substring(2, 15)}`;
      }
    },

    after: async (handler: MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult>) => {
      const endTime = Date.now();
      const startTime = (handler as any).__startTime || endTime;
      const processingTime = endTime - startTime;

      const event = handler.event;
      const context = handler.context;
      const response = handler.response;

      if (!response) return;

      const requestInfo = extractRequestInfo(event, context, finalConfig);
      const responseInfo = extractResponseInfo(response, processingTime);

      if (finalConfig.logResponses) {
        logger.info('Request completed', {
          ...requestInfo,
          ...responseInfo,
          timestamp: new Date(endTime).toISOString(),
          awsRequestId: context.awsRequestId
        });
      }

      if (finalConfig.logPerformance) {
        const metrics = buildPerformanceMetrics(
          requestInfo,
          responseInfo,
          context,
          processingTime
        );

        logPerformanceMetrics(metrics);
      }

      // Log business events
      logBusinessEvent(event, response, processingTime);
    },

    onError: async (handler: MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult>) => {
      if (!finalConfig.logErrors) return;

      const endTime = Date.now();
      const startTime = (handler as any).__startTime || endTime;
      const processingTime = endTime - startTime;

      const event = handler.event;
      const context = handler.context;
      const error = handler.error;

      const requestInfo = extractRequestInfo(event, context, finalConfig);

      logger.error('Request failed with error', {
        ...requestInfo,
        error: {
          name: error?.name || 'UnknownError',
          message: error?.message || 'Unknown error occurred',
          stack: error?.stack,
          statusCode: (error as any)?.statusCode || 500
        },
        processingTime,
        timestamp: new Date(endTime).toISOString(),
        awsRequestId: context.awsRequestId,
        functionName: context.functionName
      });

      // Log performance for error cases
      if (finalConfig.logPerformance) {
        const metrics = buildPerformanceMetrics(
          requestInfo,
          {
            statusCode: (error as any)?.statusCode || 500,
            bodyLength: 0,
            processingTime,
            success: false
          },
          context,
          processingTime
        );

        logPerformanceMetrics(metrics);
      }

      // Security logging for authentication/authorization errors
      if (error && isSecurityError(error)) {
        logger.security('Security-related error', {
          requestId: requestInfo.requestId,
          path: requestInfo.path,
          method: requestInfo.method,
          sourceIp: requestInfo.sourceIp,
          userAgent: requestInfo.userAgent,
          userId: requestInfo.userId,
          error: {
            name: error.name,
            message: error.message,
            statusCode: (error as any)?.statusCode
          }
        });
      }
    }
  };
};

// Extract request information
function extractRequestInfo(
  event: APIGatewayProxyEvent,
  context: Context,
  config: Required<LoggingConfig>
): RequestInfo {
  const requestInfo: RequestInfo = {
    requestId: event.requestContext?.requestId || context.awsRequestId,
    method: event.httpMethod,
    path: event.path,
    userAgent: event.headers['User-Agent'] || event.headers['user-agent'],
    sourceIp: event.requestContext?.identity?.sourceIp
  };

  // Add query parameters
  if (event.queryStringParameters) {
    requestInfo.queryParams = event.queryStringParameters;
  }

  // Add path parameters
  if (event.pathParameters) {
    requestInfo.pathParams = event.pathParameters;
  }

  // Add body length
  if (event.body) {
    requestInfo.bodyLength = event.body.length;
  }

  // Extract user info if enabled and available
  if (config.includeUserInfo) {
    try {
      const parsedBody = event.body ? JSON.parse(event.body) : {};
      if (parsedBody.userId) {
        requestInfo.userId = parsedBody.userId;
      }
      if (parsedBody.organizationId) {
        requestInfo.organizationId = parsedBody.organizationId;
      }
    } catch {
      // Ignore JSON parsing errors for user info extraction
    }

    // Also check path parameters for user info
    if (event.pathParameters?.userId) {
      requestInfo.userId = event.pathParameters.userId;
    }

    // Check query parameters for organization info
    if (event.queryStringParameters?.organizationId) {
      requestInfo.organizationId = parseInt(event.queryStringParameters.organizationId, 10);
    }
  }

  return requestInfo;
}

// Extract response information
function extractResponseInfo(
  response: APIGatewayProxyResult,
  processingTime: number
): ResponseInfo {
  const bodyLength = response.body ? response.body.length : 0;
  const success = response.statusCode >= 200 && response.statusCode < 400;

  return {
    statusCode: response.statusCode,
    bodyLength,
    processingTime,
    success
  };
}

// Build performance metrics
function buildPerformanceMetrics(
  requestInfo: RequestInfo,
  responseInfo: ResponseInfo,
  context: Context,
  processingTime: number
): PerformanceMetrics {
  const isSlowRequest = processingTime > MONITORING_CONSTANTS.PERFORMANCE.WARNING_THRESHOLD_MS;
  const isErrorRequest = !responseInfo.success;

  return {
    requestId: requestInfo.requestId,
    processingTime,
    memoryUsed: context.memoryLimitInMB ?
      (parseInt(context.memoryLimitInMB, 10) - context.getRemainingTimeInMillis()) : undefined,
    coldStart: (context as any).coldStart || false,
    functionName: context.functionName,
    isSlowRequest,
    isErrorRequest
  };
}

// Log performance metrics
function logPerformanceMetrics(metrics: PerformanceMetrics): void {
  logger.performance(
    `Request performance: ${metrics.functionName}`,
    metrics.processingTime,
    {
      requestId: metrics.requestId,
      memoryUsed: metrics.memoryUsed,
      coldStart: metrics.coldStart,
      isSlowRequest: metrics.isSlowRequest,
      isErrorRequest: metrics.isErrorRequest
    }
  );

  // Additional warnings for performance issues
  if (metrics.processingTime > MONITORING_CONSTANTS.PERFORMANCE.ERROR_THRESHOLD_MS) {
    logger.error('Request exceeded error threshold', {
      requestId: metrics.requestId,
      processingTime: metrics.processingTime,
      threshold: MONITORING_CONSTANTS.PERFORMANCE.ERROR_THRESHOLD_MS,
      functionName: metrics.functionName
    });
  } else if (metrics.isSlowRequest) {
    logger.warn('Slow request detected', {
      requestId: metrics.requestId,
      processingTime: metrics.processingTime,
      threshold: MONITORING_CONSTANTS.PERFORMANCE.WARNING_THRESHOLD_MS,
      functionName: metrics.functionName
    });
  }
}

// Log business events
function logBusinessEvent(
  event: APIGatewayProxyEvent,
  response: APIGatewayProxyResult,
  processingTime: number
): void {
  // Log compliance-specific business events
  const isComplianceRequest = event.path.includes('/compliance/');

  if (isComplianceRequest && response.statusCode === 200) {
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const responseBody = response.body ? JSON.parse(response.body) : {};

      if (event.path.endsWith('/ask') && body.question) {
        logger.businessEvent('compliance_question_answered', {
          questionLength: body.question.length,
          userId: body.userId,
          organizationId: body.organizationId,
          framework: body.context?.currentProgram,
          userRole: body.context?.userRole,
          urgencyLevel: body.context?.urgencyLevel,
          responseLength: responseBody.data?.answer?.length,
          conversationId: responseBody.data?.conversationId,
          processingTime,
          timestamp: new Date().toISOString()
        });
      } else if (event.path.includes('/history/')) {
        logger.businessEvent('conversation_history_accessed', {
          userId: event.pathParameters?.userId,
          organizationId: event.queryStringParameters?.organizationId,
          responseCount: responseBody.data?.conversations?.length || 0,
          processingTime,
          timestamp: new Date().toISOString()
        });
      }
    } catch {
      // Ignore JSON parsing errors for business events
    }
  }
}

// Check if error is security-related
function isSecurityError(error: Error): boolean {
  const securityKeywords = [
    'unauthorized',
    'forbidden',
    'access denied',
    'authentication',
    'authorization',
    'token',
    'credential',
    'permission'
  ];

  const errorMessage = error.message.toLowerCase();
  return securityKeywords.some(keyword => errorMessage.includes(keyword));
}

// Sanitize headers for logging
function sanitizeHeaders(
  headers: Record<string, string | undefined>,
  sanitizeList: readonly string[]
): Record<string, string | undefined> {
  const sanitized = { ...headers };

  sanitizeList.forEach(headerName => {
    const lowerHeaderName = headerName.toLowerCase();
    Object.keys(sanitized).forEach(key => {
      if (key.toLowerCase() === lowerHeaderName) {
        sanitized[key] = '[SANITIZED]';
      }
    });
  });

  return sanitized;
}

// Truncate body for logging
function truncateBody(body: string, maxLength: number): string {
  if (body.length <= maxLength) {
    return body;
  }
  return `${body.substring(0, maxLength)}... [truncated]`;
}

// Export convenience middleware instances
export const defaultRequestLogger = requestLogger();

export const productionRequestLogger = requestLogger({
  logRequests: true,
  logResponses: false, // Reduce log volume in production
  logErrors: true,
  logPerformance: true,
  maxBodyLength: 500, // Smaller body logs in production
  includeUserInfo: false // Don't log user info in production for privacy
});

export const developmentRequestLogger = requestLogger({
  logRequests: true,
  logResponses: true,
  logErrors: true,
  logPerformance: true,
  maxBodyLength: 2000,
  includeUserInfo: true
});
