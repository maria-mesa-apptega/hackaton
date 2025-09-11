/**
 * Middleware barrel export file
 * Centralized exports for all middleware functions
 */

// Validation middleware
export {
  validator,
  validateComplianceAskRequest,
  validateUserIdParam,
  validateConversationIdParam,
  validateHistoryQueryParams
} from './validation.middleware';

// Logging middleware
export {
  requestLogger,
  defaultRequestLogger,
  productionRequestLogger,
  developmentRequestLogger
} from './logging.middleware';

// Authentication middleware
export {
  authenticator,
  defaultAuth,
  developmentAuth,
  productionAuth,
  readOnlyAuth,
  getAuthContext
} from './auth.middleware';

// Type exports
export type { AuthContext } from './auth.middleware';
