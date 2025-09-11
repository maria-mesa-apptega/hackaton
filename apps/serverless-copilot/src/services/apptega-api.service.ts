/**
 * Apptega API Integration Service
 * Handles integration with existing one-api and web-api services for context enrichment
 */

import type {
  ComplianceFramework,
  OrganizationId,
  UserId,
  Result
} from '../types';
import { logger, API_CONSTANTS } from '@utils/index';

// API response interfaces
export interface OneAPIResponse<T = unknown> {
  readonly success: boolean;
  readonly data?: T;
  readonly error?: string;
  readonly message?: string;
}

export interface WebAPIResponse<T = unknown> {
  readonly status: 'success' | 'error';
  readonly data?: T;
  readonly message?: string;
}

// Compliance status from existing APIs
export interface ComplianceStatus {
  readonly organizationId: OrganizationId;
  readonly framework: ComplianceFramework;
  readonly overallScore: number;
  readonly controlsImplemented: number;
  readonly totalControls: number;
  readonly lastAssessmentDate?: string;
  readonly nextAuditDate?: string;
  readonly criticalFindings: number;
  readonly riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

// User context from existing APIs
export interface UserContext {
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly permissions: readonly string[];
  readonly activeAssessments: readonly string[];
  readonly dashboardMetrics: {
    readonly tasksCompleted: number;
    readonly controlsAssigned: number;
    readonly upcomingDeadlines: number;
  };
}

// Organization insights from existing APIs
export interface OrganizationInsights {
  readonly organizationId: OrganizationId;
  readonly compliancePrograms: readonly ComplianceFramework[];
  readonly maturityLevel: number; // 1-5 scale
  readonly industryBenchmark: number;
  readonly trendingTopics: readonly string[];
  readonly recentActivity: readonly {
    readonly type: 'assessment' | 'control_update' | 'evidence_upload';
    readonly description: string;
    readonly timestamp: string;
  }[];
}

// API configuration
interface APIConfig {
  readonly oneAPIBaseURL: string;
  readonly webAPIBaseURL: string;
  readonly timeout: number;
  readonly retryAttempts: number;
}

// Apptega API Service implementation
export class ApptegaAPIService {
  private static instance: ApptegaAPIService;
  private readonly config: APIConfig;

  private constructor() {
    this.config = {
      oneAPIBaseURL: process.env.ONE_API_BASE_URL || 'http://one-api:3000',
      webAPIBaseURL: process.env.WEB_API_BASE_URL || 'http://web:8080',
      timeout: API_CONSTANTS.REQUEST.TIMEOUT_MS,
      retryAttempts: 2
    };

    logger.info('Apptega API service initialized', {
      oneAPIBaseURL: this.config.oneAPIBaseURL,
      webAPIBaseURL: this.config.webAPIBaseURL,
      timeout: this.config.timeout
    });
  }

  public static getInstance(): ApptegaAPIService {
    if (!ApptegaAPIService.instance) {
      ApptegaAPIService.instance = new ApptegaAPIService();
    }
    return ApptegaAPIService.instance;
  }

  // Get compliance status from one-api
  public async getComplianceStatus(
    organizationId: OrganizationId,
    framework?: ComplianceFramework
  ): Promise<Result<ComplianceStatus | null, Error>> {
    const startTime = Date.now();

    try {
      const endpoint = framework
        ? `/api/v1/compliance/status/${organizationId}/${framework}`
        : `/api/v1/compliance/status/${organizationId}`;

      const response = await this.callOneAPI<{
        organizationId: number;
        framework: string;
        overallScore: number;
        controlsImplemented: number;
        totalControls: number;
        lastAssessmentDate?: string;
        nextAuditDate?: string;
        criticalFindings: number;
        riskLevel: string;
      }>(endpoint, 'GET');

      if (!response.success) {
      logger.warn('Failed to get compliance status from one-api', {
        organizationId: organizationId.toString(),
        framework,
        error: response.error
      });
        return { success: true, data: null }; // Graceful degradation
      }

      if (!response.data) {
        return { success: true, data: null };
      }

      const complianceStatus: ComplianceStatus = {
        organizationId: response.data.organizationId,
        framework: response.data.framework as ComplianceFramework,
        overallScore: response.data.overallScore,
        controlsImplemented: response.data.controlsImplemented,
        totalControls: response.data.totalControls,
        ...(response.data.lastAssessmentDate && { lastAssessmentDate: response.data.lastAssessmentDate }),
        ...(response.data.nextAuditDate && { nextAuditDate: response.data.nextAuditDate }),
        criticalFindings: response.data.criticalFindings,
        riskLevel: response.data.riskLevel as ComplianceStatus['riskLevel']
      };

      const duration = Date.now() - startTime;
      logger.info('Compliance status retrieved from one-api', {
        organizationId: organizationId.toString(),
        framework,
        overallScore: complianceStatus.overallScore,
        duration
      });

      return { success: true, data: complianceStatus };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown API error';

      logger.error('Error getting compliance status from one-api', {
        organizationId: organizationId.toString(),
        framework,
        error: errorMessage,
        duration
      });

      // Graceful degradation - don't fail the main request
      return { success: true, data: null };
    }
  }

  // Get user context from web-api
  public async getUserContext(
    userId: UserId,
    organizationId: OrganizationId
  ): Promise<Result<UserContext | null, Error>> {
    const startTime = Date.now();

    try {
      const endpoint = `/api/compliance/user-context`;
      const payload = { userId, organizationId };

      const response = await this.callWebAPI<{
        userId: string;
        organizationId: number;
        permissions: string[];
        activeAssessments: string[];
        dashboardMetrics: {
          tasksCompleted: number;
          controlsAssigned: number;
          upcomingDeadlines: number;
        };
      }>(endpoint, 'POST', payload);

      if (response.status !== 'success' || !response.data) {
        logger.warn('Failed to get user context from web-api', {
          userId,
          organizationId: organizationId.toString(),
          error: response.message
        });
        return { success: true, data: null }; // Graceful degradation
      }

      const userContext: UserContext = {
        userId: response.data.userId,
        organizationId: response.data.organizationId,
        permissions: response.data.permissions,
        activeAssessments: response.data.activeAssessments,
        dashboardMetrics: response.data.dashboardMetrics
      };

      const duration = Date.now() - startTime;
      logger.info('User context retrieved from web-api', {
        userId,
        organizationId: organizationId.toString(),
        permissionCount: userContext.permissions.length,
        activeAssessmentCount: userContext.activeAssessments.length,
        duration
      });

      return { success: true, data: userContext };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown API error';

      logger.error('Error getting user context from web-api', {
        userId,
        organizationId: organizationId.toString(),
        error: errorMessage,
        duration
      });

      // Graceful degradation
      return { success: true, data: null };
    }
  }

  // Get organization insights from web-api
  public async getOrganizationInsights(
    organizationId: OrganizationId
  ): Promise<Result<OrganizationInsights | null, Error>> {
    const startTime = Date.now();

    try {
      const endpoint = `/api/compliance/organization-insights/${organizationId}`;

      const response = await this.callWebAPI<{
        organizationId: number;
        compliancePrograms: string[];
        maturityLevel: number;
        industryBenchmark: number;
        trendingTopics: string[];
        recentActivity: Array<{
          type: string;
          description: string;
          timestamp: string;
        }>;
      }>(endpoint, 'GET');

      if (response.status !== 'success' || !response.data) {
        logger.warn('Failed to get organization insights from web-api', {
          organizationId: organizationId.toString(),
          error: response.message
        });
        return { success: true, data: null };
      }

      const insights: OrganizationInsights = {
        organizationId: response.data.organizationId,
        compliancePrograms: response.data.compliancePrograms as ComplianceFramework[],
        maturityLevel: response.data.maturityLevel,
        industryBenchmark: response.data.industryBenchmark,
        trendingTopics: response.data.trendingTopics,
        recentActivity: response.data.recentActivity.map(activity => ({
          type: activity.type as OrganizationInsights['recentActivity'][0]['type'],
          description: activity.description,
          timestamp: activity.timestamp
        }))
      };

      const duration = Date.now() - startTime;
      logger.info('Organization insights retrieved from web-api', {
        organizationId: organizationId.toString(),
        maturityLevel: insights.maturityLevel,
        programCount: insights.compliancePrograms.length,
        duration
      });

      return { success: true, data: insights };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown API error';

      logger.error('Error getting organization insights from web-api', {
        organizationId: organizationId.toString(),
        error: errorMessage,
        duration
      });

      return { success: true, data: null };
    }
  }

  // Get framework-specific guidance from one-api
  public async getFrameworkGuidance(
    framework: ComplianceFramework,
    controlId?: string
  ): Promise<Result<string | null, Error>> {
    try {
      const endpoint = controlId
        ? `/api/v1/frameworks/${framework}/controls/${controlId}/guidance`
        : `/api/v1/frameworks/${framework}/guidance`;

      const response = await this.callOneAPI<{
        framework: string;
        guidance: string;
        lastUpdated: string;
      }>(endpoint, 'GET');

      if (!response.success || !response.data) {
        return { success: true, data: null };
      }

      logger.debug('Framework guidance retrieved', {
        framework,
        controlId,
        guidanceLength: response.data.guidance.length
      });

      return { success: true, data: response.data.guidance };
    } catch (error) {
      logger.error('Error getting framework guidance', {
        framework,
        controlId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      return { success: true, data: null };
    }
  }

  // Call one-api with retry logic
  private async callOneAPI<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    payload?: unknown
  ): Promise<OneAPIResponse<T>> {
    const url = `${this.config.oneAPIBaseURL}${endpoint}`;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'ApptegaComplianceCopilot/1.0'
          },
          signal: AbortSignal.timeout(this.config.timeout)
        };

        if (payload) {
          fetchOptions.body = JSON.stringify(payload);
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as OneAPIResponse<T>;
        return data;
      } catch (error) {
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          logger.warn('one-api call failed, retrying', {
            attempt: attempt + 1,
            maxAttempts: this.config.retryAttempts + 1,
            delay,
            endpoint,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error('All retry attempts failed');
  }

  // Call web-api with retry logic
  private async callWebAPI<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'GET',
    payload?: unknown
  ): Promise<WebAPIResponse<T>> {
    const url = `${this.config.webAPIBaseURL}${endpoint}`;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const fetchOptions: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'ApptegaComplianceCopilot/1.0'
          },
          signal: AbortSignal.timeout(this.config.timeout)
        };

        if (payload) {
          fetchOptions.body = JSON.stringify(payload);
        }

        const response = await fetch(url, fetchOptions);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json() as WebAPIResponse<T>;
        return data;
      } catch (error) {
        if (attempt < this.config.retryAttempts) {
          const delay = Math.pow(2, attempt) * 1000;
          logger.warn('web-api call failed, retrying', {
            attempt: attempt + 1,
            maxAttempts: this.config.retryAttempts + 1,
            delay,
            endpoint,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw error;
      }
    }

    throw new Error('All retry attempts failed');
  }

  // Health check for both APIs
  public async healthCheck(): Promise<Result<{ oneAPI: boolean; webAPI: boolean }, Error>> {
    try {
      const [oneAPIResult, webAPIResult] = await Promise.allSettled([
        this.checkOneAPIHealth(),
        this.checkWebAPIHealth()
      ]);

      const oneAPIHealthy = oneAPIResult.status === 'fulfilled' && oneAPIResult.value;
      const webAPIHealthy = webAPIResult.status === 'fulfilled' && webAPIResult.value;

      logger.info('API health check completed', {
        oneAPI: oneAPIHealthy,
        webAPI: webAPIHealthy
      });

      return {
        success: true,
        data: {
          oneAPI: oneAPIHealthy,
          webAPI: webAPIHealthy
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('API health check failed')
      };
    }
  }

  // Check one-api health
  private async checkOneAPIHealth(): Promise<boolean> {
    try {
      const response = await this.callOneAPI<{ status: string }>('/api/v1/health', 'GET');
      return response.success && response.data?.status === 'ok';
    } catch {
      return false;
    }
  }

  // Check web-api health
  private async checkWebAPIHealth(): Promise<boolean> {
    try {
      const response = await this.callWebAPI<{ status: string }>('/health', 'GET');
      return response.status === 'success' && response.data?.status === 'ok';
    } catch {
      return false;
    }
  }
}
