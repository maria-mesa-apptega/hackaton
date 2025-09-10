/**
 * Bedrock AI Handler
 * Direct interface to AWS Bedrock for AI model interactions
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import jsonBodyParser from '@middy/http-json-body-parser';
import httpErrorHandler from '@middy/http-error-handler';
import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';

import type { AIProcessingRequest, AIProcessingResponse, Result } from '../../types';
import { BedrockService } from '@services/bedrock.service';
import { logger, success, error, validationError } from '@utils/index';

// Extended event interface with parsed body
interface BedrockProcessingEvent extends Omit<APIGatewayProxyEvent, 'body'> {
  body: AIProcessingRequest;
}

// AI processing request schema
const aiProcessingRequestSchema = {
  type: 'object',
  properties: {
    prompt: {
      type: 'string',
      minLength: 10,
      maxLength: 8000
    },
    model: {
      type: 'string',
      enum: ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus']
    },
    maxTokens: {
      type: 'integer',
      minimum: 100,
      maximum: 4096,
      nullable: true
    },
    temperature: {
      type: 'number',
      minimum: 0,
      maximum: 1,
      nullable: true
    },
    context: {
      type: 'object',
      nullable: true,
      additionalProperties: true
    },
    userContext: {
      type: 'object',
      nullable: true,
      additionalProperties: true
    }
  },
  required: ['prompt', 'model'],
  additionalProperties: false
} as const;

// Raw Lambda handler
const rawHandler = async (
  event: BedrockProcessingEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info('Processing direct Bedrock AI request', {
    requestId,
    model: event.body.model,
    promptLength: event.body.prompt.length,
    maxTokens: event.body.maxTokens,
    temperature: event.body.temperature,
    userAgent: event.headers['User-Agent'],
    sourceIP: event.requestContext.identity.sourceIp
  });

  try {
    // Additional validation
    if (!event.body.prompt.trim()) {
      return validationError('Prompt cannot be empty', 'prompt', requestId);
    }

    // Get Bedrock service instance
    const bedrockService = BedrockService.getInstance();

    // Process the AI request directly
    const result: Result<AIProcessingResponse, Error> = await bedrockService.processRequest(event.body);

    if (!result.success) {
      logger.error('Bedrock AI processing failed', {
        requestId,
        error: result.error.message,
        model: event.body.model,
        promptLength: event.body.prompt.length
      });

      return error({
        code: 'BEDROCK_PROCESSING_ERROR',
        message: result.error.message,
        statusCode: 500,
        timestamp: new Date().toISOString(),
        requestId
      } as any);
    }

    const totalTime = Date.now() - startTime;

    logger.info('Bedrock AI request completed successfully', {
      requestId,
      model: result.data.model,
      tokensUsed: result.data.tokensUsed,
      processingTime: totalTime,
      responseLength: result.data.content.length,
      finishReason: result.data.finishReason
    });

    // Return successful response
    return success(result.data, 200, {
      'X-Request-ID': requestId,
      'X-Processing-Time': `${totalTime}ms`,
      'X-Tokens-Used': result.data.tokensUsed.toString(),
      'X-AI-Model': result.data.model
    });

  } catch (err) {
    const totalTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

    logger.error('Unexpected error in Bedrock AI handler', {
      requestId,
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      processingTime: totalTime,
      model: event.body?.model,
      promptLength: event.body?.prompt?.length
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
    eventSchema: transpileSchema(aiProcessingRequestSchema, { verbose: true })
  }))
  .use(httpErrorHandler({
    logger: (error) => {
      logger.error('Bedrock handler middleware error', {
        error: error.message,
        stack: error.stack
      });
    }
  }));
