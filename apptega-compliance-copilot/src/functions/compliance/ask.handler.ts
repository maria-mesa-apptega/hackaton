/**
 * Compliance Ask Handler
 * Main endpoint for processing compliance questions using AI
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import jsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';

import type { ComplianceAskRequest, ComplianceResponse, Result } from '../../types';
import { ComplianceOrchestratorService } from '@services/compliance-orchestrator.service';
import { logger, success, error, validationError } from '@utils/index';
import { complianceAskRequestSchema } from '@schemas/ask-request.schema';

// Extended event interface with parsed body
interface ComplianceAskEvent extends Omit<APIGatewayProxyEvent, 'body'> {
  body: ComplianceAskRequest;
}

// Raw Lambda handler
const rawHandler = async (
  event: ComplianceAskEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info('Processing compliance ask request', {
    requestId,
    userId: event.body.userId,
    organizationId: event.body.organizationId.toString(),
    questionLength: event.body.question.length,
    sessionId: event.body.sessionId,
    userAgent: event.headers['User-Agent'],
    sourceIP: event.requestContext.identity.sourceIp
  });

  try {
    // Validate required fields (additional validation beyond schema)
    if (!event.body.question.trim()) {
      return validationError('Question cannot be empty', 'question', requestId);
    }

    if (event.body.question.length > 4000) {
      return validationError('Question too long (max 4000 characters)', 'question', requestId);
    }

    // Get orchestrator service instance
    const orchestrator = ComplianceOrchestratorService.getInstance();

    // Process the compliance request
    const result: Result<ComplianceResponse, Error> = await orchestrator.processComplianceRequest(event.body);

    if (!result.success) {
      logger.error('Compliance request processing failed', {
        requestId,
        error: result.error.message,
        userId: event.body.userId,
        organizationId: event.body.organizationId.toString()
      });

      return error({
        code: 'COMPLIANCE_PROCESSING_ERROR',
        message: result.error.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId
      } as any);
    }

    const totalTime = Date.now() - startTime;

    logger.info('Compliance ask request completed successfully', {
      requestId,
      conversationId: result.data.conversationId,
      processingTime: totalTime,
      responseLength: result.data.answer.length,
      frameworks: result.data.metadata.complianceFrameworks,
      dataSources: result.data.metadata.dataSources,
      confidenceScore: result.data.metadata.confidenceScore
    });

    // Return successful response
    return success(result.data, 201, {
      'X-Request-ID': requestId,
      'X-Processing-Time': `${totalTime}ms`,
      'X-Conversation-ID': result.data.conversationId
    });

  } catch (err) {
    const totalTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

    logger.error('Unexpected error in compliance ask handler', {
      requestId,
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      processingTime: totalTime,
      userId: event.body?.userId,
      organizationId: event.body?.organizationId?.toString()
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
  .use(jsonBodyParser())
  .use(validator({
    eventSchema: transpileSchema(complianceAskRequestSchema, { verbose: true })
  }))
  .use(httpErrorHandler({
    logger: (error: any) => {
      logger.error('Middleware error handler', {
        error: error.message,
        stack: error.stack
      });
    }
  }));
