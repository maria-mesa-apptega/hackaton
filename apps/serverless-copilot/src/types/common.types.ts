/**
 * Common types and interfaces used across the application
 * Following strict TypeScript practices - no `any` types allowed
 */

// Base types for domain entities
export type UserId = string;
export type OrganizationId = number;
export type ConversationId = string;
export type SessionId = string;

// Compliance framework types
export type ComplianceFramework =
  | 'NIST_CSF_V1_1'
  | 'ISO_27001'
  | 'SOC2_TYPE_I'
  | 'SOC2_TYPE_II'
  | 'CIS_CONTROLS'
  | 'CCPA'
  | 'GDPR'
  | 'HIPAA'
  | 'PCI_DSS';

// User roles in compliance context
export type UserRole =
  | 'CISO'
  | 'COMPLIANCE_OFFICER'
  | 'IT_ADMINISTRATOR'
  | 'SECURITY_ANALYST'
  | 'AUDITOR'
  | 'EXECUTIVE'
  | 'USER';

// Data source types for AI responses
export type DataSource =
  | 'apptega_controls'
  | 'user_assessments'
  | 'bedrock_ai'
  | 'mysql_context'
  | 'one_api'
  | 'web_api';

// Processing status
export type ProcessingStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'timeout';

// AI Model types
export type AIModel =
  | 'claude-3-5-sonnet'
  | 'claude-3-haiku'
  | 'claude-3-opus';

// Industry types (for context)
export type Industry =
  | 'healthcare'
  | 'financial_services'
  | 'technology'
  | 'manufacturing'
  | 'retail'
  | 'government'
  | 'education'
  | 'other';

// Error types
export interface AppError {
  readonly code: string;
  readonly message: string;
  readonly statusCode: number;
  readonly timestamp: string;
  readonly requestId?: string;
  readonly context?: Record<string, unknown>;
}

// Result pattern for error handling
export type Result<T, E = AppError> =
  | { success: true; data: T }
  | { success: false; error: E };

// HTTP Response types
export interface APIResponse<T = unknown> {
  readonly statusCode: number;
  readonly body: string;
  readonly headers?: Record<string, string>;
}

// Lambda context types
export interface LambdaContext {
  readonly requestId: string;
  readonly functionName: string;
  readonly functionVersion: string;
  readonly invokedFunctionArn: string;
  readonly memoryLimitInMB: string;
  readonly awsRequestId: string;
  readonly logGroupName: string;
  readonly logStreamName: string;
}

// Audit trail
export interface AuditTrail {
  readonly action: string;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly timestamp: string;
  readonly resource: string;
  readonly details: Record<string, unknown>;
}
