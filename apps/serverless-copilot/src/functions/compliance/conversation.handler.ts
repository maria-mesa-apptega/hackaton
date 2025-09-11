/**
 * Conversation Details Handler
 * Retrieves details for a specific conversation
 */

import type { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';

import type { ConversationRecord, Result } from '../../types';
import { DynamoDBService } from '@services/dynamodb.service';
import { logger, success, error, validationError, notFound } from '@utils/index';

// Conversation response interface
interface ConversationDetailsResponse {
  readonly conversationId: string;
  readonly question: string;
  readonly answer: string;
  readonly processingTime: string;
  readonly metadata: {
    readonly dataSources: readonly string[];
    readonly complianceFrameworks: readonly string[];
    readonly organizationContext: boolean;
    readonly wordCount: number;
    readonly aiModel: string;
    readonly confidenceScore?: number;
    readonly relevantControls?: any[];
    readonly suggestedActions?: any[];
  };
  readonly createdAt: string;
  readonly userId: string;
  readonly organizationId: number;
  readonly sessionId?: string | undefined;
}

// Raw Lambda handler
const rawHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  // Extract path parameters
  const conversationId = event.pathParameters?.conversationId;
  const userId = event.queryStringParameters?.userId;
  const organizationId = event.queryStringParameters?.organizationId;

  logger.info('Processing conversation details request', {
    requestId,
    conversationId: conversationId || 'undefined',
    userId: userId || 'undefined',
    organizationId: organizationId || 'undefined',
    userAgent: event.headers['User-Agent'],
    sourceIP: event.requestContext.identity.sourceIp
  });

  try {
    // Validate required parameters
    if (!conversationId) {
      return validationError('conversationId is required in path', 'conversationId', requestId);
    }

    if (!userId) {
      return validationError('userId is required in query parameters', 'userId', requestId);
    }

    if (!organizationId) {
      return validationError('organizationId is required in query parameters', 'organizationId', requestId);
    }

    // Parse organizationId
    const parsedOrgId = parseInt(organizationId, 10);
    if (isNaN(parsedOrgId)) {
      return validationError('organizationId must be a valid number', 'organizationId', requestId);
    }

    // Get DynamoDB service instance
    const dynamoService = DynamoDBService.getInstance();

    // Retrieve conversation details
    const result: Result<ConversationRecord | null, Error> = await dynamoService.getConversation(
      userId,
      conversationId
    );

    if (!result.success) {
      logger.error('Failed to retrieve conversation details', {
        requestId,
        error: result.success ? 'Unexpected error' : (result as any).error.message,
        conversationId,
        userId,
        organizationId: parsedOrgId.toString()
      });

      return error({
        code: 'CONVERSATION_RETRIEVAL_ERROR',
        message: result.success ? 'Unexpected error' : (result as any).error.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId
      } as any);
    }

    if (!result.data) {
      logger.warn('Conversation not found', {
        requestId,
        conversationId,
        userId,
        organizationId: parsedOrgId.toString()
      });

      return notFound('Conversation', conversationId, requestId);
    }

    // Build response
    const conversationDetails: ConversationDetailsResponse = {
      conversationId: result.data.conversationId,
      question: result.data.question,
      answer: result.data.answer,
      processingTime: `${result.data.processingTimeMs}ms`,
      metadata: result.data.metadata,
      createdAt: result.data.createdAt,
      userId: result.data.userId,
      organizationId: result.data.organizationId,
      sessionId: result.data.sessionId || undefined
    };

    const totalTime = Date.now() - startTime;

    logger.info('Conversation details request completed successfully', {
      requestId,
      conversationId,
      userId,
      organizationId: parsedOrgId.toString(),
      answerLength: result.data.answer.length,
      frameworks: result.data.metadata.complianceFrameworks,
      processingTime: totalTime
    });

    // Return successful response
    return success(conversationDetails, 200, {
      'X-Request-ID': requestId,
      'X-Processing-Time': `${totalTime}ms`,
      'X-Conversation-ID': conversationId
    });

  } catch (err) {
    const totalTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

    logger.error('Unexpected error in conversation details handler', {
      requestId,
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      processingTime: totalTime,
      conversationId: conversationId || 'undefined',
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
