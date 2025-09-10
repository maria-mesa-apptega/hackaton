/**
 * Validation Middleware using AJV and Middy
 * Provides comprehensive input validation for all API endpoints
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import type { MiddyfiedHandler } from '@middy/core';
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import type { JSONSchemaType } from 'ajv';
import { logger, validationError } from '@utils/index';

// Validation configuration
interface ValidationConfig {
  readonly inputSchema?: JSONSchemaType<any>;
  readonly pathParametersSchema?: JSONSchemaType<any>;
  readonly queryStringSchema?: JSONSchemaType<any>;
  readonly enableLogging?: boolean;
}

// Validation error details
interface ValidationErrorDetail {
  readonly field: string;
  readonly message: string;
  readonly receivedValue?: unknown;
}

// AJV instance configuration
const createAjvInstance = (): Ajv => {
  const ajv = new Ajv({
    allErrors: true,
    removeAdditional: false, // Don't remove additional properties for debugging
    useDefaults: true,
    coerceTypes: false, // Be strict about types
    strict: true,
    strictSchema: true,
    validateFormats: true
  });

  // Add format support
  addFormats(ajv);

  // Add custom formats
  ajv.addFormat('user-id', {
    type: 'string',
    validate: (value: string) => /^[a-zA-Z0-9_-]+$/.test(value) && value.length >= 1 && value.length <= 255
  });

  ajv.addFormat('organization-id', {
    type: 'number',
    validate: (value: number) => Number.isInteger(value) && value > 0 && value <= 2147483647
  });

  ajv.addFormat('conversation-id', {
    type: 'string',
    validate: (value: string) => /^[a-zA-Z0-9_-]+$/.test(value) && value.length >= 1 && value.length <= 255
  });

  return ajv;
};

// Global AJV instance
const ajv = createAjvInstance();

// Validation middleware factory
export const validator = (config: ValidationConfig) => {
  // Compile schemas once for better performance
  const validateInput = config.inputSchema ? ajv.compile(config.inputSchema) : null;
  const validatePathParameters = config.pathParametersSchema ? ajv.compile(config.pathParametersSchema) : null;
  const validateQueryString = config.queryStringSchema ? ajv.compile(config.queryStringSchema) : null;

  const middleware = {
    before: async (handler: MiddyfiedHandler<APIGatewayProxyEvent, APIGatewayProxyResult>) => {
      const event = handler.event;
      const requestId = event.requestContext?.requestId || 'unknown';

      try {
        const validationErrors: ValidationErrorDetail[] = [];

        // Validate request body
        if (validateInput && event.body) {
          let parsedBody: unknown;

          try {
            parsedBody = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
          } catch (parseError) {
            if (config.enableLogging) {
              logger.warn('Invalid JSON in request body', {
                requestId,
                error: parseError instanceof Error ? parseError.message : 'JSON parse error'
              });
            }

            handler.response = validationError('Invalid JSON in request body', 'body', requestId);
            return;
          }

          if (!validateInput(parsedBody)) {
            const inputErrors = this.formatAjvErrors(validateInput.errors || [], 'body');
            validationErrors.push(...inputErrors);
          }

          // Store parsed body for further use
          (event as any).parsedBody = parsedBody;
        }

        // Validate path parameters
        if (validatePathParameters && event.pathParameters) {
          if (!validatePathParameters(event.pathParameters)) {
            const pathErrors = this.formatAjvErrors(validatePathParameters.errors || [], 'pathParameters');
            validationErrors.push(...pathErrors);
          }
        }

        // Validate query string parameters
        if (validateQueryString && event.queryStringParameters) {
          if (!validateQueryString(event.queryStringParameters)) {
            const queryErrors = this.formatAjvErrors(validateQueryString.errors || [], 'queryStringParameters');
            validationErrors.push(...queryErrors);
          }
        }

        // Check for validation errors
        if (validationErrors.length > 0) {
          if (config.enableLogging) {
            logger.warn('Request validation failed', {
              requestId,
              errors: validationErrors,
              path: event.path,
              method: event.httpMethod
            });
          }

          const firstError = validationErrors[0];
          handler.response = validationError(
            `Validation failed: ${firstError.message}`,
            firstError.field,
            requestId
          );
          return;
        }

        if (config.enableLogging) {
          logger.debug('Request validation successful', {
            requestId,
            path: event.path,
            method: event.httpMethod,
            hasBody: !!event.body,
            hasPathParams: !!event.pathParameters,
            hasQueryParams: !!event.queryStringParameters
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown validation error';

        logger.error('Validation middleware error', {
          requestId,
          error: errorMessage,
          path: event.path,
          method: event.httpMethod
        });

        handler.response = validationError(
          'Request validation failed due to internal error',
          undefined,
          requestId
        );
      }
    },

    // Helper method to format AJV errors
    formatAjvErrors: (errors: any[], context: string): ValidationErrorDetail[] => {
      return errors.map(error => ({
        field: error.instancePath ? `${context}${error.instancePath}` : context,
        message: this.buildErrorMessage(error),
        receivedValue: error.data
      }));
    },

    // Build human-readable error messages
    buildErrorMessage: (error: any): string => {
      const { keyword, message, params } = error;

      switch (keyword) {
        case 'required':
          return `Missing required field: ${params.missingProperty}`;
        case 'type':
          return `Expected ${params.type} but received ${typeof error.data}`;
        case 'format':
          return `Invalid format. Expected: ${params.format}`;
        case 'minLength':
          return `Must be at least ${params.limit} characters long`;
        case 'maxLength':
          return `Must not exceed ${params.limit} characters`;
        case 'minimum':
          return `Must be at least ${params.limit}`;
        case 'maximum':
          return `Must not exceed ${params.limit}`;
        case 'pattern':
          return `Must match pattern: ${params.pattern}`;
        case 'enum':
          return `Must be one of: ${params.allowedValues?.join(', ') || 'specified values'}`;
        case 'additionalProperties':
          return `Unexpected property: ${params.additionalProperty}`;
        default:
          return message || `Validation failed for ${keyword}`;
      }
    }
  };

  return middleware;
};

// Convenience validators for common schemas
export const validateComplianceAskRequest = validator({
  inputSchema: {
    type: 'object',
    properties: {
      question: {
        type: 'string',
        minLength: 10,
        maxLength: 2000,
        pattern: '^[\\s\\S]*\\S[\\s\\S]*$'
      },
      userId: {
        type: 'string',
        format: 'user-id'
      },
      organizationId: {
        type: 'number',
        format: 'organization-id'
      },
      sessionId: {
        type: 'string',
        format: 'user-id',
        nullable: true
      },
      context: {
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
          urgencyLevel: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            nullable: true
          }
        },
        required: [],
        additionalProperties: false,
        nullable: true
      }
    },
    required: ['question', 'userId', 'organizationId'],
    additionalProperties: false
  } as JSONSchemaType<any>,
  enableLogging: true
});

export const validateUserIdParam = validator({
  pathParametersSchema: {
    type: 'object',
    properties: {
      userId: {
        type: 'string',
        format: 'user-id'
      }
    },
    required: ['userId'],
    additionalProperties: true
  } as JSONSchemaType<any>,
  enableLogging: true
});

export const validateConversationIdParam = validator({
  pathParametersSchema: {
    type: 'object',
    properties: {
      conversationId: {
        type: 'string',
        format: 'conversation-id'
      }
    },
    required: ['conversationId'],
    additionalProperties: true
  } as JSONSchemaType<any>,
  enableLogging: true
});

export const validateHistoryQueryParams = validator({
  queryStringSchema: {
    type: 'object',
    properties: {
      organizationId: {
        type: 'string',
        pattern: '^[1-9][0-9]*$',
        nullable: true
      },
      limit: {
        type: 'string',
        pattern: '^([1-9]|[1-9][0-9]|100)$',
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
  } as JSONSchemaType<any>,
  enableLogging: true
});
