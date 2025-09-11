/**
 * Compliance History Handler
 * Retrieves conversation history for a specific user
 */

import type { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';

import type { ConversationHistoryRequest, ConversationHistoryResponse, Result } from '../../types';
import { DynamoDBService } from '@services/dynamodb.service';
import { logger, success, error, validationError } from '@utils/index';

// Raw Lambda handler
const rawHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  // Extract path parameters
  const userId = event.pathParameters?.userId;
  const organizationId = event.queryStringParameters?.organizationId;
  const limit = event.queryStringParameters?.limit;
  const cursor = event.queryStringParameters?.cursor;
  const startDate = event.queryStringParameters?.startDate;
  const endDate = event.queryStringParameters?.endDate;

  logger.info('Processing conversation history request', {
    requestId,
    userId: userId || 'undefined',
    organizationId: organizationId || 'undefined',
    limit: limit || 'undefined',
    cursor: cursor || 'undefined',
    dateRange: startDate && endDate ? { startDate, endDate } : undefined,
    userAgent: event.headers['User-Agent'],
    sourceIP: event.requestContext.identity.sourceIp
  });

  try {
    // Validate required parameters
    if (!userId) {
      return validationError('userId is required in path', 'userId', requestId);
    }

    if (!organizationId) {
      return validationError('organizationId is required in query parameters', 'organizationId', requestId);
    }

    // Parse and validate limit
    let parsedLimit: number | undefined;
    if (limit) {
      parsedLimit = parseInt(limit, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
        return validationError('limit must be a number between 1 and 100', 'limit', requestId);
      }
    }

    // Parse organizationId
    const parsedOrgId = parseInt(organizationId, 10);
    if (isNaN(parsedOrgId)) {
      return validationError('organizationId must be a valid number', 'organizationId', requestId);
    }

    // Build request object
    const historyRequest: ConversationHistoryRequest = {
      userId,
      organizationId: parsedOrgId,
      ...(parsedLimit && { limit: parsedLimit }),
      ...(cursor && { cursor }),
      ...(startDate && endDate && { dateRange: { startDate, endDate } })
    };

    // Get DynamoDB service instance
    const dynamoService = DynamoDBService.getInstance();

    // Retrieve conversation history
    const result: Result<ConversationHistoryResponse, Error> = await dynamoService.getConversationHistory(historyRequest);

    if (!result.success) {
      logger.error('Failed to retrieve conversation history', {
        requestId,
        error: result.success ? 'Unexpected error' : (result as any).error.message,
        userId,
        organizationId: parsedOrgId.toString()
      });

      return error({
        code: 'HISTORY_RETRIEVAL_ERROR',
        message: result.success ? 'Unexpected error' : (result as any).error.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId
      } as any);
    }

    const totalTime = Date.now() - startTime;

    logger.info('Conversation history request completed successfully', {
      requestId,
      userId,
      organizationId: parsedOrgId.toString(),
      conversationCount: result.data.conversations.length,
      totalCount: result.data.totalCount,
      hasNextPage: !!result.data.nextCursor,
      processingTime: totalTime
    });

    // Return successful response
    return success(result.data, 200, {
      'X-Request-ID': requestId,
      'X-Processing-Time': `${totalTime}ms`,
      'X-Total-Count': result.data.totalCount.toString(),
      'X-Has-Next-Page': result.data.nextCursor ? 'true' : 'false'
    });

  } catch (err) {
    const totalTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

    logger.error('Unexpected error in conversation history handler', {
      requestId,
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      processingTime: totalTime,
      userId: userId || 'undefined',
      organizationId: organizationId || 'undefined'
    });

    return error({
      code: 'INTERNAL_SERVER_ERROR',
      message: `Internal server error: ${errorMessage}`,
      statusCode: 500,
      timestamp: new Date().toISOString(),
      requestId
    } as any);
  }
};

// Apply middleware
export const handler = middy(rawHandler)
  .use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    headers: [
      'Content-Type',
      'X-Amz-Date',
      'Authorization',
      'X-Api-Key',
      'X-Amz-Security-Token',
      'X-Amz-User-Agent',
      'X-Request-ID'
    ].join(','),
    credentials: false
  }))
  .use(httpErrorHandler({
    logger: (error: any) => {
      logger.error('Middleware error handler', {
        error: error.message,
        stack: error.stack
      });
    }
  }));
