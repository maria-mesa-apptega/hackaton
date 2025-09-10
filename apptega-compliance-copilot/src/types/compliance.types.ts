/**
 * Compliance-specific types and interfaces
 * Defines the core data structures for compliance operations
 */

import type {
  UserId,
  OrganizationId,
  ConversationId,
  SessionId,
  ComplianceFramework,
  UserRole,
  DataSource,
  Industry,
  AIModel,
  ProcessingStatus
} from './common.types';

// Request interfaces
export interface ComplianceAskRequest {
  readonly question: string;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly sessionId?: SessionId;
  readonly context?: ComplianceContext;
}

export interface ComplianceContext {
  readonly currentProgram?: ComplianceFramework;
  readonly userRole?: UserRole;
  readonly organizationIndustry?: Industry;
  readonly previousConversations?: ConversationSummary[];
  readonly urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ConversationSummary {
  readonly conversationId: ConversationId;
  readonly question: string;
  readonly timestamp: string;
  readonly topics: string[];
}

// Response interfaces
export interface ComplianceResponse {
  readonly answer: string; // Markdown formatted content
  readonly conversationId: ConversationId;
  readonly sessionId?: SessionId;
  readonly processingTime: string;
  readonly metadata: ComplianceResponseMetadata;
}

export interface ComplianceResponseMetadata {
  readonly dataSources: readonly DataSource[];
  readonly complianceFrameworks: readonly ComplianceFramework[];
  readonly organizationContext: boolean;
  readonly wordCount: number;
  readonly aiModel: AIModel;
  readonly confidenceScore?: number; // 0-100
  readonly relevantControls?: ControlReference[];
  readonly suggestedActions?: SuggestedAction[];
}

export interface ControlReference {
  readonly frameworkId: ComplianceFramework;
  readonly controlId: string;
  readonly controlTitle: string;
  readonly implementationStatus?: 'not_implemented' | 'in_progress' | 'implemented' | 'compliant';
  readonly currentScore?: number; // 0-100
}

export interface SuggestedAction {
  readonly action: string;
  readonly priority: 'low' | 'medium' | 'high';
  readonly estimatedEffort: string;
  readonly apptegaPath?: string;
  readonly dueDate?: string;
}

// Conversation history interfaces
export interface ConversationHistoryRequest {
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly limit?: number;
  readonly cursor?: string;
  readonly dateRange?: DateRange;
}

export interface DateRange {
  readonly startDate: string;
  readonly endDate: string;
}

export interface ConversationHistoryResponse {
  readonly conversations: readonly ConversationHistoryItem[];
  readonly totalCount: number;
  readonly nextCursor?: string;
}

export interface ConversationHistoryItem {
  readonly id: ConversationId;
  readonly question: string;
  readonly answerPreview: string; // First 150 chars of answer
  readonly timestamp: string;
  readonly topics: readonly string[];
  readonly frameworks: readonly ComplianceFramework[];
  readonly processingTime: string;
  readonly wordCount: number;
}

// Tenant/Organization context
export interface TenantContext {
  readonly organizationId: OrganizationId;
  readonly organizationName: string;
  readonly industry?: Industry;
  readonly currentProgram?: ComplianceFramework;
  readonly partnerName?: string;
  readonly partnerType?: string;
  readonly complianceLevel?: number; // 0-100
  readonly activeFrameworks: readonly ComplianceFramework[];
}

export interface UserComplianceData {
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly assignedTasks: readonly ComplianceTask[];
  readonly completedAssessments: readonly Assessment[];
  readonly controls: readonly Control[];
}

export interface ComplianceTask {
  readonly id: string;
  readonly title: string;
  readonly status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  readonly dueDate?: string;
  readonly controlId?: string;
  readonly frameworkId?: ComplianceFramework;
}

export interface Assessment {
  readonly id: string;
  readonly name: string;
  readonly frameworkId: ComplianceFramework;
  readonly completionDate: string;
  readonly score: number; // 0-100
  readonly status: 'draft' | 'completed' | 'under_review' | 'approved';
}

export interface Control {
  readonly id: string;
  readonly controlNumber: string;
  readonly controlTitle: string;
  readonly status: 'not_implemented' | 'in_progress' | 'implemented' | 'compliant';
  readonly frameworkId: ComplianceFramework;
  readonly implementationPercentage: number; // 0-100
  readonly evidenceCount: number;
  readonly lastUpdated: string;
}

// AI Processing interfaces
export interface AIProcessingRequest {
  readonly prompt: string;
  readonly model: AIModel;
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly context?: TenantContext;
  readonly userContext?: UserComplianceData;
}

export interface AIProcessingResponse {
  readonly content: string;
  readonly model: AIModel;
  readonly tokensUsed: number;
  readonly processingTimeMs: number;
  readonly finishReason: 'stop' | 'length' | 'content_filter' | 'timeout';
}

// Database record interfaces
export interface ConversationRecord {
  readonly PK: string; // USER#{userId}
  readonly SK: string; // CONVERSATION#{timestamp}#{conversationId}
  readonly GSI1PK: string; // ORG#{organizationId}
  readonly GSI1SK: string; // CONVERSATION#{timestamp}
  readonly conversationId: ConversationId;
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly sessionId?: SessionId;
  readonly question: string;
  readonly answer: string;
  readonly metadata: ComplianceResponseMetadata;
  readonly processingTimeMs: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly ttl?: number; // Auto-expire after X days
}
