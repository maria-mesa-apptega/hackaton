/**
 * Conversation Schema
 * Validation schemas for conversation-related endpoints
 */

import type { JSONSchemaType } from 'ajv';
import type { ConversationHistoryResponse, ConversationHistoryItem } from '@types/index';

// Schema for conversation history item
export const conversationHistoryItemSchema: JSONSchemaType<ConversationHistoryItem> = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
      minLength: 1,
      maxLength: 255
    },
    question: {
      type: 'string',
      minLength: 1,
      maxLength: 2000
    },
    answerPreview: {
      type: 'string',
      minLength: 0,
      maxLength: 200
    },
    timestamp: {
      type: 'string',
      format: 'date-time'
    },
    topics: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 10
    },
    frameworks: {
      type: 'array',
      items: {
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
        ]
      },
      maxItems: 5
    },
    processingTime: {
      type: 'string',
      pattern: '^[0-9]+(\.[0-9]+)?(ms|s)$'
    },
    wordCount: {
      type: 'integer',
      minimum: 0
    }
  },
  required: [
    'id',
    'question',
    'answerPreview',
    'timestamp',
    'topics',
    'frameworks',
    'processingTime',
    'wordCount'
  ],
  additionalProperties: false
};

// Schema for conversation history response
export const conversationHistoryResponseSchema: JSONSchemaType<ConversationHistoryResponse> = {
  type: 'object',
  properties: {
    conversations: {
      type: 'array',
      items: conversationHistoryItemSchema,
      maxItems: 100
    },
    totalCount: {
      type: 'integer',
      minimum: 0
    },
    nextCursor: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      nullable: true
    }
  },
  required: ['conversations', 'totalCount'],
  additionalProperties: false
};

// Schema for conversation details response
export const conversationDetailsResponseSchema: JSONSchemaType<{
  conversationId: string;
  question: string;
  answer: string;
  processingTime: string;
  metadata: {
    dataSources: readonly string[];
    complianceFrameworks: readonly string[];
    organizationContext: boolean;
    wordCount: number;
    aiModel: string;
    confidenceScore?: number;
    relevantControls?: any[];
    suggestedActions?: any[];
  };
  createdAt: string;
  userId: string;
  organizationId: number;
  sessionId?: string;
}> = {
  type: 'object',
  properties: {
    conversationId: {
      type: 'string',
      minLength: 1,
      maxLength: 255
    },
    question: {
      type: 'string',
      minLength: 1,
      maxLength: 2000
    },
    answer: {
      type: 'string',
      minLength: 1,
      maxLength: 10000
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
          minItems: 1
        },
        complianceFrameworks: {
          type: 'array',
          items: { type: 'string' }
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
        },
        relevantControls: {
          type: 'array',
          items: { type: 'object' },
          nullable: true
        },
        suggestedActions: {
          type: 'array',
          items: { type: 'object' },
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
      additionalProperties: true
    },
    createdAt: {
      type: 'string',
      format: 'date-time'
    },
    userId: {
      type: 'string',
      minLength: 1,
      maxLength: 255
    },
    organizationId: {
      type: 'integer',
      minimum: 1
    },
    sessionId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      nullable: true
    }
  },
  required: [
    'conversationId',
    'question',
    'answer',
    'processingTime',
    'metadata',
    'createdAt',
    'userId',
    'organizationId'
  ],
  additionalProperties: false
};

// Schema for history endpoint path parameters
export const historyPathParamsSchema: JSONSchemaType<{
  userId: string;
}> = {
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

// Schema for conversation endpoint path parameters
export const conversationPathParamsSchema: JSONSchemaType<{
  conversationId: string;
}> = {
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

// Schema for history query parameters
export const historyQueryParamsSchema: JSONSchemaType<{
  organizationId?: string;
  limit?: string;
  cursor?: string;
  startDate?: string;
  endDate?: string;
}> = {
  type: 'object',
  properties: {
    organizationId: {
      type: 'string',
      pattern: '^[1-9][0-9]*$',
      nullable: true
    },
    limit: {
      type: 'string',
      pattern: '^[1-9][0-9]?$|^100$',
      nullable: true
    },
    cursor: {
      type: 'string',
      minLength: 1,
      maxLength: 500,
      nullable: true
    },
    startDate: {
      type: 'string',
      format: 'date-time',
      nullable: true
    },
    endDate: {
      type: 'string',
      format: 'date-time',
      nullable: true
    }
  },
  required: [],
  additionalProperties: false
};

// Schema for conversation query parameters
export const conversationQueryParamsSchema: JSONSchemaType<{
  userId?: string;
  organizationId?: string;
}> = {
  type: 'object',
  properties: {
    userId: {
      type: 'string',
      minLength: 1,
      maxLength: 255,
      pattern: '^[a-zA-Z0-9_-]+$',
      nullable: true
    },
    organizationId: {
      type: 'string',
      pattern: '^[1-9][0-9]*$',
      nullable: true
    }
  },
  required: [],
  additionalProperties: false
};
