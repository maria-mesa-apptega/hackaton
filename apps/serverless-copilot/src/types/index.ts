/**
 * Main types export file
 * Centralized exports for all type definitions
 */

// Common types
export type {
  UserId,
  OrganizationId,
  ConversationId,
  SessionId,
  ComplianceFramework,
  UserRole,
  DataSource,
  ProcessingStatus,
  AIModel,
  Industry,
  AppError as CommonAppError,
  Result,
  APIResponse,
  LambdaContext,
  AuditTrail
} from './common.types';

// Compliance types
export type {
  ComplianceAskRequest,
  ComplianceContext,
  ConversationSummary,
  ComplianceResponse,
  ComplianceResponseMetadata,
  ControlReference,
  SuggestedAction,
  ConversationHistoryRequest,
  DateRange,
  ConversationHistoryResponse,
  ConversationHistoryItem,
  TenantContext,
  UserComplianceData,
  ComplianceTask,
  Assessment,
  Control,
  AIProcessingRequest,
  AIProcessingResponse,
  ConversationRecord
} from './compliance.types';

// Error types
export {
  ErrorCode
} from './errors.types';

export type {
  BaseError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  BusinessLogicError,
  RateLimitError,
  ExternalServiceError,
  InternalServerError,
  TimeoutError,
  AppError,
  ErrorFactory,
  ErrorContext
} from './errors.types';
