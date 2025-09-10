/**
 * AI Models Handler
 * Provides information about available AI models and their capabilities
 */

import type { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';

import type { AIModel } from '../../types';
import { BedrockService } from '@services/bedrock.service';
import { logger, success, error } from '@utils/index';

// Model information interface
interface ModelInfo {
  readonly id: AIModel;
  readonly name: string;
  readonly description: string;
  readonly maxTokens: number;
  readonly costPer1kTokens: {
    readonly input: number;
    readonly output: number;
  };
  readonly strengths: readonly string[];
  readonly bestUseCases: readonly string[];
  readonly averageResponseTime: string;
  readonly isAvailable: boolean;
}

// Models list response interface
interface ModelsListResponse {
  readonly models: readonly ModelInfo[];
  readonly defaultModel: AIModel;
  readonly fallbackModel: AIModel;
  readonly healthStatus: {
    readonly overall: 'healthy' | 'degraded' | 'unhealthy';
    readonly models: Record<AIModel, 'healthy' | 'degraded' | 'unhealthy'>;
  };
}

// Model health check response interface
interface ModelHealthResponse {
  readonly model: AIModel;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly responseTime: number;
  readonly lastChecked: string;
  readonly error?: string | undefined;
}

// Raw Lambda handler
const rawHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const path = event.path;
  const method = event.httpMethod;

  logger.info('Processing AI models request', {
    requestId,
    path,
    method,
    userAgent: event.headers['User-Agent'],
    sourceIP: event.requestContext.identity.sourceIp
  });

  try {
    const bedrockService = BedrockService.getInstance();

    // Route based on path and method
    if (method === 'GET' && path.endsWith('/models')) {
      return await handleModelsList(requestId, bedrockService);
    } else if (method === 'GET' && path.includes('/models/') && path.endsWith('/health')) {
      const modelId = extractModelIdFromPath(path);
      if (!modelId) {
        return error({
          code: 'INVALID_MODEL_ID',
          message: 'Invalid model ID in path',
          statusCode: 400,
          timestamp: new Date().toISOString(),
          requestId
        } as any);
      }
      return await handleModelHealth(requestId, modelId, bedrockService);
    } else if (method === 'POST' && path.endsWith('/models/health')) {
      return await handleAllModelsHealth(requestId, bedrockService);
    } else {
    return error({
      code: 'UNSUPPORTED_OPERATION',
      message: `Unsupported operation: ${method} ${path}`,
      statusCode: 405,
      timestamp: new Date().toISOString(),
      requestId
    } as any);
    }

  } catch (err) {
    const totalTime = Date.now() - startTime;
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';

    logger.error('Unexpected error in AI models handler', {
      requestId,
      error: errorMessage,
      stack: err instanceof Error ? err.stack : undefined,
      processingTime: totalTime,
      path,
      method
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

// Handle models list request
async function handleModelsList(
  requestId: string,
  bedrockService: BedrockService
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();

  try {
    // Get model information
    const modelsInfo = getModelsInfo();

    // Check health of all models
    const healthChecks = await Promise.allSettled([
      checkModelHealth('claude-3-5-sonnet', bedrockService),
      checkModelHealth('claude-3-haiku', bedrockService),
      checkModelHealth('claude-3-opus', bedrockService)
    ]);

    // Process health check results
    const modelHealthStatus: Record<AIModel, 'healthy' | 'degraded' | 'unhealthy'> = {
      'claude-3-5-sonnet': getHealthFromResult(healthChecks[0]),
      'claude-3-haiku': getHealthFromResult(healthChecks[1]),
      'claude-3-opus': getHealthFromResult(healthChecks[2])
    };

    // Determine overall health
    const healthValues = Object.values(modelHealthStatus);
    const overallHealth = healthValues.every(status => status === 'healthy')
      ? 'healthy'
      : healthValues.some(status => status === 'healthy')
      ? 'degraded'
      : 'unhealthy';

    // Update model availability based on health
    const modelsWithHealth = modelsInfo.map(model => ({
      ...model,
      isAvailable: modelHealthStatus[model.id] !== 'unhealthy'
    }));

    const response: ModelsListResponse = {
      models: modelsWithHealth,
      defaultModel: 'claude-3-5-sonnet',
      fallbackModel: 'claude-3-haiku',
      healthStatus: {
        overall: overallHealth,
        models: modelHealthStatus
      }
    };

    const totalTime = Date.now() - startTime;

    logger.info('Models list request completed', {
      requestId,
      modelsCount: modelsInfo.length,
      overallHealth,
      processingTime: totalTime
    });

    return success(response, 200, {
      'X-Request-ID': requestId,
      'X-Processing-Time': `${totalTime}ms`,
      'X-Models-Count': modelsInfo.length.toString(),
      'X-Overall-Health': overallHealth
    });

  } catch (err) {
    const totalTime = Date.now() - startTime;
    logger.error('Failed to get models list', {
      requestId,
      error: err instanceof Error ? err.message : 'Unknown error',
      processingTime: totalTime
    });

    return error({
      code: 'MODELS_RETRIEVAL_ERROR',
      message: 'Failed to retrieve models information',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      requestId
    } as any);
  }
}

// Handle individual model health check
async function handleModelHealth(
  requestId: string,
  modelId: AIModel,
  bedrockService: BedrockService
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();

  try {
    const healthResult = await checkModelHealth(modelId, bedrockService);
    const totalTime = Date.now() - startTime;

    const response: ModelHealthResponse = {
      model: modelId,
      status: healthResult.status,
      responseTime: healthResult.responseTime,
      lastChecked: new Date().toISOString(),
      error: healthResult.error
    };

    logger.info('Model health check completed', {
      requestId,
      model: modelId,
      status: healthResult.status,
      responseTime: healthResult.responseTime,
      processingTime: totalTime
    });

    const statusCode = healthResult.status === 'healthy' ? 200 : 503;

    return success(response, statusCode, {
      'X-Request-ID': requestId,
      'X-Processing-Time': `${totalTime}ms`,
      'X-Model-Status': healthResult.status
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    logger.error('Model health check failed', {
      requestId,
      model: modelId,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: totalTime
    });

    const response: ModelHealthResponse = {
      model: modelId,
      status: 'unhealthy',
      responseTime: totalTime,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Health check failed'
    };

    return success(response, 503, {
      'X-Request-ID': requestId,
      'X-Processing-Time': `${totalTime}ms`,
      'X-Model-Status': 'unhealthy'
    });
  }
}

// Handle health check for all models
async function handleAllModelsHealth(
  requestId: string,
  bedrockService: BedrockService
): Promise<APIGatewayProxyResult> {
  const startTime = Date.now();

  try {
    const models: AIModel[] = ['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus'];

    const healthChecks = await Promise.allSettled(
      models.map(model => checkModelHealth(model, bedrockService))
    );

    const healthResults: ModelHealthResponse[] = models.map((model, index) => {
      const result = healthChecks[index];
      const timestamp = new Date().toISOString();

      if (result && result.status === 'fulfilled') {
        return {
          model,
          status: result.value.status,
          responseTime: result.value.responseTime,
          lastChecked: timestamp,
          error: result.value.error || undefined
        };
      } else {
        return {
          model,
          status: 'unhealthy',
          responseTime: Date.now() - startTime,
          lastChecked: timestamp,
          error: 'Health check promise rejected'
        };
      }
    });

    const totalTime = Date.now() - startTime;
    const healthyCount = healthResults.filter(r => r.status === 'healthy').length;

    logger.info('All models health check completed', {
      requestId,
      totalModels: models.length,
      healthyModels: healthyCount,
      processingTime: totalTime
    });

    return success({
      models: healthResults,
      summary: {
        total: models.length,
        healthy: healthyCount,
        degraded: healthResults.filter(r => r.status === 'degraded').length,
        unhealthy: healthResults.filter(r => r.status === 'unhealthy').length
      }
    }, 200, {
      'X-Request-ID': requestId,
      'X-Processing-Time': `${totalTime}ms`,
      'X-Healthy-Models': healthyCount.toString()
    });

  } catch (err) {
    const totalTime = Date.now() - startTime;
    logger.error('All models health check failed', {
      requestId,
      error: err instanceof Error ? err.message : 'Unknown error',
      processingTime: totalTime
    });

    return error({
      code: 'HEALTH_CHECK_ERROR',
      message: 'Failed to check models health',
      statusCode: 500,
      timestamp: new Date().toISOString(),
      requestId
    } as any);
  }
}

// Helper functions
function getModelsInfo(): ModelInfo[] {
  return [
    {
      id: 'claude-3-5-sonnet',
      name: 'Claude 3.5 Sonnet',
      description: 'Most capable model for complex reasoning and analysis',
      maxTokens: 4096,
      costPer1kTokens: { input: 0.003, output: 0.015 },
      strengths: ['Complex reasoning', 'Code analysis', 'Long-form writing', 'Detailed explanations'],
      bestUseCases: ['Compliance analysis', 'Technical documentation', 'Strategic planning'],
      averageResponseTime: '3-5 seconds',
      isAvailable: true
    },
    {
      id: 'claude-3-haiku',
      name: 'Claude 3 Haiku',
      description: 'Fast and efficient model for quick responses',
      maxTokens: 4096,
      costPer1kTokens: { input: 0.00025, output: 0.00125 },
      strengths: ['Fast responses', 'Cost-effective', 'Simple Q&A', 'Quick summaries'],
      bestUseCases: ['Quick questions', 'Simple explanations', 'Status updates'],
      averageResponseTime: '1-2 seconds',
      isAvailable: true
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      description: 'Most powerful model for the most complex tasks',
      maxTokens: 4096,
      costPer1kTokens: { input: 0.015, output: 0.075 },
      strengths: ['Highest accuracy', 'Complex problem solving', 'Advanced reasoning'],
      bestUseCases: ['Critical compliance decisions', 'Complex audit preparation'],
      averageResponseTime: '5-8 seconds',
      isAvailable: true
    }
  ];
}

async function checkModelHealth(
  model: AIModel,
  bedrockService: BedrockService
): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; responseTime: number; error?: string }> {
  const startTime = Date.now();

  try {
    const testRequest = {
      prompt: 'Hello, this is a health check. Please respond with "OK".',
      model,
      maxTokens: 10,
      temperature: 0
    };

    const result = await bedrockService.processRequest(testRequest);
    const responseTime = Date.now() - startTime;

    if (result.success && result.data.content.toLowerCase().includes('ok')) {
      const status = responseTime > 10000 ? 'degraded' : 'healthy';
      return { status, responseTime };
    } else {
      return {
        status: 'unhealthy',
        responseTime,
        error: result.success ? 'Unexpected response' : result.error.message
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

function getHealthFromResult(
  result: PromiseSettledResult<{ status: 'healthy' | 'degraded' | 'unhealthy'; responseTime: number; error?: string }>
): 'healthy' | 'degraded' | 'unhealthy' {
  if (result.status === 'fulfilled') {
    return result.value.status;
  }
  return 'unhealthy';
}

function extractModelIdFromPath(path: string): AIModel | null {
  const match = path.match(/\/models\/([^\/]+)\/health/);
  if (match && match[1]) {
    const modelId = match[1];
    if (['claude-3-5-sonnet', 'claude-3-haiku', 'claude-3-opus'].includes(modelId)) {
      return modelId as AIModel;
    }
  }
  return null;
}

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
      logger.error('Models handler middleware error', {
        error: error.message,
        stack: error.stack
      });
    }
  }));
