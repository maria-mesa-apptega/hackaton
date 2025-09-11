/**
 * Application constants and configuration values
 * Centralized constants for consistent usage across the application
 */

// Database constants
export const DATABASE_CONSTANTS = {
  MYSQL: {
    CONNECTION_TIMEOUT: 30000,
    ACQUIRE_TIMEOUT: 30000,
    IDLE_TIMEOUT: 900000,
    CONNECTION_LIMIT: 5,
    QUERY_TIMEOUT: 10000
  },
  DYNAMODB: {
    DEFAULT_TTL_DAYS: 90,
    MAX_BATCH_SIZE: 25,
    MAX_QUERY_LIMIT: 100
  }
} as const;

// AI/Bedrock constants
export const AI_CONSTANTS = {
  BEDROCK: {
    DEFAULT_MODEL: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    FALLBACK_MODEL: 'anthropic.claude-3-haiku-20240307-v1:0',
    MAX_TOKENS: 4096,
    DEFAULT_TEMPERATURE: 0.7,
    TIMEOUT_MS: 30000,
    MAX_RETRIES: 3
  },
  PROMPT: {
    MAX_CONTEXT_LENGTH: 8000,
    MAX_QUESTION_LENGTH: 2000,
    MIN_QUESTION_LENGTH: 10,
    MAX_HISTORY_ITEMS: 5
  }
} as const;

// API constants
export const API_CONSTANTS = {
  RATE_LIMIT: {
    WINDOW_MS: 60000, // 1 minute
    MAX_REQUESTS: 100,
    SKIP_SUCCESSFUL_REQUESTS: false
  },
  REQUEST: {
    MAX_BODY_SIZE: '1mb',
    TIMEOUT_MS: 30000,
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
  },
  HEADERS: {
    CORRELATION_ID: 'X-Correlation-ID',
    REQUEST_ID: 'X-Request-ID',
    USER_AGENT: 'User-Agent'
  }
} as const;

// Compliance framework constants
export const COMPLIANCE_CONSTANTS = {
  FRAMEWORKS: {
    NIST_CSF_V1_1: {
      name: 'NIST Cybersecurity Framework v1.1',
      categories: ['Identify', 'Protect', 'Detect', 'Respond', 'Recover'],
      controlCount: 108
    },
    ISO_27001: {
      name: 'ISO/IEC 27001:2013',
      categories: ['A.5', 'A.6', 'A.7', 'A.8', 'A.9', 'A.10', 'A.11', 'A.12', 'A.13', 'A.14', 'A.15', 'A.16', 'A.17', 'A.18'],
      controlCount: 114
    },
    SOC2_TYPE_I: {
      name: 'SOC 2 Type I',
      categories: ['Security', 'Availability', 'Processing Integrity', 'Confidentiality', 'Privacy'],
      controlCount: 64
    },
    SOC2_TYPE_II: {
      name: 'SOC 2 Type II',
      categories: ['Security', 'Availability', 'Processing Integrity', 'Confidentiality', 'Privacy'],
      controlCount: 64
    }
  },
  INDUSTRIES: {
    healthcare: 'Healthcare',
    financial_services: 'Financial Services',
    technology: 'Technology',
    manufacturing: 'Manufacturing',
    retail: 'Retail',
    government: 'Government',
    education: 'Education',
    other: 'Other'
  },
  USER_ROLES: {
    CISO: 'Chief Information Security Officer',
    COMPLIANCE_OFFICER: 'Compliance Officer',
    IT_ADMINISTRATOR: 'IT Administrator',
    SECURITY_ANALYST: 'Security Analyst',
    AUDITOR: 'Auditor',
    EXECUTIVE: 'Executive',
    USER: 'User'
  }
} as const;

// Performance and monitoring constants
export const MONITORING_CONSTANTS = {
  PERFORMANCE: {
    WARNING_THRESHOLD_MS: 3000,
    ERROR_THRESHOLD_MS: 5000,
    SLOW_QUERY_THRESHOLD_MS: 1000
  },
  METRICS: {
    NAMESPACE: 'ApptegaComplianceCopilot',
    DIMENSIONS: {
      STAGE: 'Stage',
      FUNCTION: 'FunctionName',
      ORGANIZATION: 'OrganizationId'
    }
  }
} as const;

// Cache constants
export const CACHE_CONSTANTS = {
  TTL: {
    USER_CONTEXT: 300, // 5 minutes
    ORGANIZATION_CONTEXT: 600, // 10 minutes
    COMPLIANCE_DATA: 1800, // 30 minutes
    AI_RESPONSE: 3600 // 1 hour (for similar questions)
  },
  KEYS: {
    USER_PREFIX: 'user:',
    ORG_PREFIX: 'org:',
    COMPLIANCE_PREFIX: 'compliance:',
    AI_RESPONSE_PREFIX: 'ai:'
  }
} as const;

// Business logic constants
export const BUSINESS_CONSTANTS = {
  CONVERSATION: {
    MAX_HISTORY_ITEMS: 50,
    DEFAULT_HISTORY_ITEMS: 10,
    AUTO_EXPIRE_DAYS: 90
  },
  COMPLIANCE: {
    MIN_COMPLETION_PERCENTAGE: 0,
    MAX_COMPLETION_PERCENTAGE: 100,
    SCORE_RANGES: {
      CRITICAL: [0, 25],
      LOW: [26, 50],
      MEDIUM: [51, 75],
      HIGH: [76, 89],
      EXCELLENT: [90, 100]
    }
  }
} as const;

// Environment-specific constants
export const ENVIRONMENT_CONSTANTS = {
  DEVELOPMENT: {
    LOG_LEVEL: 'debug',
    ENABLE_METRICS: false,
    ENABLE_TRACING: true
  },
  STAGING: {
    LOG_LEVEL: 'info',
    ENABLE_METRICS: true,
    ENABLE_TRACING: true
  },
  PRODUCTION: {
    LOG_LEVEL: 'warn',
    ENABLE_METRICS: true,
    ENABLE_TRACING: true
  }
} as const;

// Template constants for Markdown responses
export const MARKDOWN_TEMPLATES = {
  SECTION_HEADERS: {
    EXECUTIVE_SUMMARY: '## 📋 Executive Summary',
    TECHNICAL_STEPS: '## 🔧 Technical Implementation',
    APPTEGA_ACTIONS: '## 🎯 Actions in Apptega',
    COMPLIANCE_REFERENCES: '## 📊 Compliance References',
    NEXT_STEPS: '## ⏭️ Next Steps',
    DISCLAIMER: '## ⚠️ Disclaimer'
  },
  ICONS: {
    SECURITY: '🔐',
    COMPLIANCE: '📋',
    IMPLEMENTATION: '⚙️',
    WARNING: '⚠️',
    SUCCESS: '✅',
    INFO: 'ℹ️',
    ACTION: '🎯',
    REFERENCE: '📚'
  },
  PRIORITY_INDICATORS: {
    CRITICAL: '🔴 Critical',
    HIGH: '🟠 High',
    MEDIUM: '🟡 Medium',
    LOW: '🟢 Low'
  }
} as const;

// Export all constants as a single object for easy importing
export const CONSTANTS = {
  DATABASE: DATABASE_CONSTANTS,
  AI: AI_CONSTANTS,
  API: API_CONSTANTS,
  COMPLIANCE: COMPLIANCE_CONSTANTS,
  MONITORING: MONITORING_CONSTANTS,
  CACHE: CACHE_CONSTANTS,
  BUSINESS: BUSINESS_CONSTANTS,
  ENVIRONMENT: ENVIRONMENT_CONSTANTS,
  MARKDOWN: MARKDOWN_TEMPLATES
} as const;
