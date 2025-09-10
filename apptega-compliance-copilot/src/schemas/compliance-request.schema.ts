/**
 * JSON Schemas for compliance request validation
 * Uses AJV for runtime type validation with strict typing
 */

import type { JSONSchemaType } from 'ajv';
import type { ComplianceAskRequest, ComplianceContext } from '@types/index';

// Schema for ComplianceContext
export const complianceContextSchema: JSONSchemaType<ComplianceContext> = {
  type: 'object',
  properties: {
    currentProgram: {
      type: 'string',
      enum: [
        'NIST_CSF_V1_1',
        'ISO_27001',
        'SOC2_TYPE_I',
        'SOC2_TYPE_II',
        'CIS_CONTROLS',
        'CCPA',
        'GDPR',
        'HIPAA',
        'PCI_DSS'
      ],
      nullable: true
    },
    userRole: {
      type: 'string',
      enum: [
        'CISO',
        'COMPLIANCE_OFFICER',
        'IT_ADMINISTRATOR',
        'SECURITY_ANALYST',
        'AUDITOR',
        'EXECUTIVE',
        'USER'
      ],
      nullable: true
    },
    organizationIndustry: {
      type: 'string',
      enum: [
        'healthcare',
        'financial_services',
        'technology',
        'manufacturing',
        'retail',
        'government',
        'education',
        'other'
      ],
      nullable: true
    },
    previousConversations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          conversationId: { type: 'string' },
          question: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          topics: {
            type: 'array',
            items: { type: 'string' }
          }
        },
        required: ['conversationId', 'question', 'timestamp', 'topics'],
        additionalProperties: false
      },
      nullable: true,
      maxItems: 10
    },
    urgencyLevel: {
      type: 'string',
      enum: ['low', 'medium', 'high', 'critical'],
      nullable: true
    }
  },
  required: [],
  additionalProperties: false
};

// Schema for ComplianceAskRequest
export const complianceAskRequestSchema: JSONSchemaType<ComplianceAskRequest> = {
  type: 'object',
  properties: {
    question: {
      type: 'string',
      minLength: 10,
      maxLength: 2000,
      pattern: '^[\\s\\S]*\\S[\\s\\S]*$' // Must contain at least one non-whitespace character
    },
    userId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9_-]+$'
    },
    organizationId: {
      type: 'integer',
      minimum: 1,
      maximum: 2147483647 // Max 32-bit signed integer
    },
    sessionId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      nullable: true,
      pattern: '^[a-zA-Z0-9_-]+$'
    },
    context: {
      ...complianceContextSchema,
      nullable: true
    }
  },
  required: ['question', 'userId', 'organizationId'],
  additionalProperties: false
};

// Schema for conversation history request
export const conversationHistoryRequestSchema: JSONSchemaType<{
  userId: string;
  organizationId: number;
  limit?: number;
  cursor?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
}> = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9_-]+$'
    },
    organizationId: {
      type: 'integer',
      minimum: 1,
      maximum: 2147483647
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 100,
      nullable: true
    },
    cursor: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      nullable: true
    },
    dateRange: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          format: 'date-time'
        },
        endDate: {
          type: 'string',
          format: 'date-time'
        }
      },
      required: ['startDate', 'endDate'],
      additionalProperties: false,
      nullable: true
    }
  },
  required: ['userId', 'organizationId'],
  additionalProperties: false
};

// Schema for path parameters
export const userIdParamSchema: JSONSchemaType<{ userId: string }> = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9_-]+$'
    }
  },
  required: ['userId'],
  additionalProperties: false
};

export const conversationIdParamSchema: JSONSchemaType<{ conversationId: string }> = {
  type: 'object',
  properties: {
    conversationId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9_-]+$'
    }
  },
  required: ['conversationId'],
  additionalProperties: false
};

// Schema for query parameters
export const organizationQuerySchema: JSONSchemaType<{
  organizationId?: string;
  limit?: string;
  cursor?: string;
}> = {
  type: 'object',
  properties: {
    organizationId: {
      type: 'string',
      pattern: '^[1-9][0-9]*$', // Positive integer as string
      nullable: true
    },
    limit: {
      type: 'string',
      pattern: '^[1-9][0-9]?$|^100$', // 1-100 as string
      nullable: true
    },
    cursor: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      nullable: true
    }
  },
  required: [],
  additionalProperties: false
};
