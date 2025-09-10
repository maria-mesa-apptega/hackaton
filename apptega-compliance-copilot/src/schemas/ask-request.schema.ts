/**
 * Ask Request Schema
 * Specific validation schema for the ask endpoint
 */

import type { JSONSchemaType } from 'ajv';
import type { ComplianceAskRequest } from '@types/index';
import { complianceAskRequestSchema } from './compliance-request.schema';

// Export the main compliance ask request schema for use in handlers
export { complianceAskRequestSchema };

// Additional validation schema for the ask endpoint event structure
export const askEndpointEventSchema: JSONSchemaType<{
  body: ComplianceAskRequest;
  pathParameters?: Record<string, string>;
  queryStringParameters?: Record<string, string>;
}> = {
  type: 'object',
  properties: {
    body: complianceAskRequestSchema,
    pathParameters: {
      type: 'object',
      nullable: true,
      additionalProperties: { type: 'string' }
    },
    queryStringParameters: {
      type: 'object',
      nullable: true,
      additionalProperties: { type: 'string' }
    }
  },
  required: ['body'],
  additionalProperties: true // Allow other Lambda event properties
};

// Schema for validating the response structure
export const complianceResponseSchema: JSONSchemaType<{
  answer: string;
  conversationId: string;
  sessionId?: string;
  processingTime: string;
  metadata: {
    dataSources: readonly string[];
    complianceFrameworks: readonly string[];
    organizationContext: boolean;
    wordCount: number;
    aiModel: string;
    confidenceScore?: number;
  };
}> = {
  type: 'object',
  properties: {
    answer: {
      type: 'string',
      minLength: 50,
      maxLength: 10000
    },
    conversationId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9_-]+$'
    },
    sessionId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9_-]+$',
      nullable: true
    },
    processingTime: {
      type: 'string',
      pattern: '^[0-9]+(\.[0-9]+)?(ms|s)$'
    },
    metadata: {
      type: 'object',
      properties: {
        dataSources: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          uniqueItems: true
        },
        complianceFrameworks: {
          type: 'array',
          items: { type: 'string' },
          uniqueItems: true
        },
        organizationContext: {
          type: 'boolean'
        },
        wordCount: {
          type: 'integer',
          minimum: 0
        },
        aiModel: {
          type: 'string',
          enum: [
            'claude-3-5-sonnet',
            'claude-3-haiku',
            'claude-3-opus'
          ]
        },
        confidenceScore: {
          type: 'number',
          minimum: 0,
          maximum: 100,
          nullable: true
        }
      },
      required: [
        'dataSources',
        'complianceFrameworks',
        'organizationContext',
        'wordCount',
        'aiModel'
      ],
      additionalProperties: true // Allow additional metadata fields
    }
  },
  required: [
    'answer',
    'conversationId',
    'processingTime',
    'metadata'
  ],
  additionalProperties: false
};
