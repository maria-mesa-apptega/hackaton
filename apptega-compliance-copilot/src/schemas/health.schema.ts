/**
 * Health Check Schema
 * Validation schemas for health check endpoints
 */

import type { JSONSchemaType } from 'ajv';

// Service status interface for schema
interface ServiceStatus {
  readonly status: 'healthy' | 'unhealthy' | 'degraded';
  readonly responseTimeMs?: number;
  readonly error?: string;
  readonly lastChecked: string;
}

// Health check response interface for schema
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

// Simple health response for basic ping
interface SimpleHealthResponse {
  readonly status: 'healthy';
  readonly timestamp: string;
  readonly message: string;
}

// Schema for service status
export const serviceStatusSchema: JSONSchemaType<ServiceStatus> = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['healthy', 'unhealthy', 'degraded']
    },
    responseTimeMs: {
      type: 'number',
      minimum: 0,
      nullable: true
    },
    error: {
      type: 'string',
      nullable: true
    },
    lastChecked: {
      type: 'string',
      format: 'date-time'
    }
  },
  required: ['status', 'lastChecked'],
  additionalProperties: false
};

// Schema for detailed health check response
export const healthCheckResponseSchema: JSONSchemaType<HealthCheckResponse> = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['healthy', 'unhealthy']
    },
    timestamp: {
      type: 'string',
      format: 'date-time'
    },
    version: {
      type: 'string',
      minLength: 1
    },
    environment: {
      type: 'string',
      enum: ['dev', 'staging', 'prod', 'test']
    },
    services: {
      type: 'object',
      properties: {
        mysql: serviceStatusSchema,
        dynamodb: serviceStatusSchema,
        bedrock: serviceStatusSchema
      },
      required: ['mysql', 'dynamodb', 'bedrock'],
      additionalProperties: false
    },
    performance: {
      type: 'object',
      properties: {
        totalCheckTimeMs: {
          type: 'number',
          minimum: 0
        },
        uptime: {
          type: 'number',
          minimum: 0
        }
      },
      required: ['totalCheckTimeMs', 'uptime'],
      additionalProperties: false
    }
  },
  required: [
    'status',
    'timestamp',
    'version',
    'environment',
    'services',
    'performance'
  ],
  additionalProperties: false
};

// Schema for simple health response
export const simpleHealthResponseSchema: JSONSchemaType<SimpleHealthResponse> = {
  type: 'object',
  properties: {
    status: {
      type: 'string',
      enum: ['healthy']
    },
    timestamp: {
      type: 'string',
      format: 'date-time'
    },
    message: {
      type: 'string',
      minLength: 1
    }
  },
  required: ['status', 'timestamp', 'message'],
  additionalProperties: false
};

// Schema for health check query parameters
export const healthQueryParamsSchema: JSONSchemaType<{
  detailed?: string;
}> = {
  type: 'object',
  properties: {
    detailed: {
      type: 'string',
      enum: ['true', 'false'],
      nullable: true
    }
  },
  required: [],
  additionalProperties: false
};
