/**
 * Health Check Handler
 * Provides system health status and readiness checks
 */

import type { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import middy from '@middy/core';
import cors from '@middy/http-cors';
import httpErrorHandler from '@middy/http-error-handler';

import { MySQLService } from '@services/mysql.service';
import { DynamoDBService } from '@services/dynamodb.service';
import { BedrockService } from '@services/bedrock.service';
import { logger, success } from '@utils/index';

// Health check response interface
interface HealthCheckResponse {
  readonly status: 'healthy' | 'unhealthy';
  readonly timestamp: string;
  readonly version: string;
  readonly environment: string;
  readonly services: {
    readonly mysql: ServiceStatus;
    readonly dynamodb: ServiceStatus;
    readonly bedrock: ServiceStatus;
  };
  readonly performance: {
    readonly totalCheckTimeMs: number;
    readonly uptime: number;
  };
}

interface ServiceStatus {
  readonly status: 'healthy' | 'unhealthy' | 'degraded';
  readonly responseTimeMs?: number;
  readonly error?: string;
  readonly lastChecked: string;
}

// Raw Lambda handler
const rawHandler: APIGatewayProxyHandler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;

  logger.info('Processing health check request', {
    requestId,
    userAgent: event.headers['User-Agent'],
    sourceIP: event.requestContext.identity.sourceIp
  });

  try {
    // Check if this is a detailed health check or simple ping
    const detailed = event.queryStringParameters?.detailed === 'true';

    if (!detailed) {
      // Simple ping response
      const simpleResponse = {
        status: 'healthy' as const,
        timestamp: new Date().toISOString(),
        message: 'Apptega Compliance Copilot is running'
      };

      return success(simpleResponse, 200, {
        'X-Request-ID': requestId,
        'X-Health-Check': 'simple'
      });
    }

    // Detailed health check
    const healthCheckPromises = [
      checkMySQLHealth(),
      checkDynamoDBHealth(),
      checkBedrockHealth()
    ];

    const results = await Promise.allSettled(healthCheckPromises);

    // Ensure we have all results
    if (results.length < 3) {
      throw new Error('Incomplete health check results');
    }

    // Process service statuses
    const mysqlHealth = extractServiceStatus(results[0]!, 'MySQL');
    const dynamodbHealth = extractServiceStatus(results[1]!, 'DynamoDB');
    const bedrockHealth = extractServiceStatus(results[2]!, 'Bedrock');

    // Determine overall health
    const allServices = [mysqlHealth, dynamodbHealth, bedrockHealth];
    const hasUnhealthy = allServices.some(service => service.status === 'unhealthy');

    const overallStatus: 'healthy' | 'unhealthy' = hasUnhealthy ? 'unhealthy' : 'healthy';

    const totalTime = Date.now() - startTime;

    // Build detailed response
    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.STAGE || 'dev',
      services: {
        mysql: mysqlHealth,
        dynamodb: dynamodbHealth,
        bedrock: bedrockHealth
      },
      performance: {
        totalCheckTimeMs: totalTime,
        uptime: process.uptime()
      }
    };

    logger.info('Health check completed', {
      requestId,
      overallStatus,
      totalTime,
      mysqlStatus: mysqlHealth.status,
      dynamodbStatus: dynamodbHealth.status,
      bedrockStatus: bedrockHealth.status
    });

    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    return success(healthResponse, statusCode, {
      'X-Request-ID': requestId,
      'X-Health-Check': 'detailed',
      'X-Overall-Status': overallStatus
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    logger.error('Health check failed', {
      requestId,
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      processingTime: totalTime
    });

    const unhealthyResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.STAGE || 'dev',
      services: {
        mysql: { status: 'unhealthy', error: 'Health check failed', lastChecked: new Date().toISOString() },
        dynamodb: { status: 'unhealthy', error: 'Health check failed', lastChecked: new Date().toISOString() },
        bedrock: { status: 'unhealthy', error: 'Health check failed', lastChecked: new Date().toISOString() }
      },
      performance: {
        totalCheckTimeMs: totalTime,
        uptime: process.uptime()
      }
    };

    return success(unhealthyResponse, 503, {
      'X-Request-ID': requestId,
      'X-Health-Check': 'failed'
    });
  }
};

// Helper functions for service health checks
async function checkMySQLHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    const mysqlService = MySQLService.getInstance();
    const result = await mysqlService.healthCheck();

    const responseTime = Date.now() - startTime;

    if (result.success) {
      return {
        status: 'healthy',
        responseTimeMs: responseTime,
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        status: 'unhealthy',
        responseTimeMs: responseTime,
        error: result.error.message,
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      responseTimeMs: responseTime,
      error: error instanceof Error ? error.message : 'MySQL health check failed',
      lastChecked: new Date().toISOString()
    };
  }
}

async function checkDynamoDBHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    const dynamoService = DynamoDBService.getInstance();
    const result = await dynamoService.healthCheck();

    const responseTime = Date.now() - startTime;

    if (result.success) {
      return {
        status: 'healthy',
        responseTimeMs: responseTime,
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        status: 'unhealthy',
        responseTimeMs: responseTime,
        error: result.error.message,
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      responseTimeMs: responseTime,
      error: error instanceof Error ? error.message : 'DynamoDB health check failed',
      lastChecked: new Date().toISOString()
    };
  }
}

async function checkBedrockHealth(): Promise<ServiceStatus> {
  const startTime = Date.now();
  try {
    const bedrockService = BedrockService.getInstance();
    const result = await bedrockService.healthCheck();

    const responseTime = Date.now() - startTime;

    if (result.success) {
      return {
        status: 'healthy',
        responseTimeMs: responseTime,
        lastChecked: new Date().toISOString()
      };
    } else {
      return {
        status: 'unhealthy',
        responseTimeMs: responseTime,
        error: result.error.message,
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      status: 'unhealthy',
      responseTimeMs: responseTime,
      error: error instanceof Error ? error.message : 'Bedrock health check failed',
      lastChecked: new Date().toISOString()
    };
  }
}

function extractServiceStatus(
  promiseResult: PromiseSettledResult<ServiceStatus>,
  serviceName: string
): ServiceStatus {
  if (promiseResult.status === 'rejected') {
    return {
      status: 'unhealthy',
      error: `${serviceName} health check promise rejected: ${promiseResult.reason}`,
      lastChecked: new Date().toISOString()
    };
  }

  return promiseResult.value;
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
      logger.error('Health check middleware error', {
        error: error.message,
        stack: error.stack
      });
    }
  }));
