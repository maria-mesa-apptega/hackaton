/**
 * Compliance Orchestrator Service
 * Coordinates all compliance-related services with parallel processing for optimal performance
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ComplianceAskRequest,
  ComplianceResponse,
  ComplianceResponseMetadata,
  TenantContext,
  UserComplianceData,
  ConversationSummary,
  Result
} from '@types';
import { MySQLService } from './mysql.service';
import { DynamoDBService } from './dynamodb.service';
import { BedrockService } from './bedrock.service';
import { PromptService } from './prompt.service';
import { ApptegaAPIService } from './apptega-api.service';
import {
  logger,
  createInternalServerError,
  createTimeoutError,
  MONITORING_CONSTANTS
} from '@utils/index';

// Performance monitoring interface
interface PerformanceMetrics {
  readonly totalTime: number;
  readonly dataGatheringTime: number;
  readonly aiProcessingTime: number;
  readonly historySaveTime: number;
  readonly parallelOperations: number;
}

// Context gathering results
interface ContextGatheringResult {
  readonly tenantContext: TenantContext | null;
  readonly userComplianceData: UserComplianceData | null;
  readonly complianceStatus: any | null;
  readonly userContext: any | null;
  readonly organizationInsights: any | null;
  readonly frameworkGuidance: string | null;
  readonly conversationHistory: ConversationSummary[];
}

// Orchestrator configuration
interface OrchestratorConfig {
  readonly maxProcessingTimeMs: number;
  readonly enableParallelProcessing: boolean;
  readonly enableContextEnrichment: boolean;
  readonly maxHistoryItems: number;
}

// Compliance Orchestrator Service implementation
export class ComplianceOrchestratorService {
  private static instance: ComplianceOrchestratorService;
  private readonly mysqlService: MySQLService;
  private readonly dynamodbService: DynamoDBService;
  private readonly bedrockService: BedrockService;
  private readonly promptService: PromptService;
  private readonly apptegaAPIService: ApptegaAPIService;
  private readonly config: OrchestratorConfig;

  private constructor() {
    this.mysqlService = MySQLService.getInstance();
    this.dynamodbService = DynamoDBService.getInstance();
    this.bedrockService = BedrockService.getInstance();
    this.promptService = PromptService.getInstance();
    this.apptegaAPIService = ApptegaAPIService.getInstance();

    this.config = {
      maxProcessingTimeMs: 5000, // 5 second target
      enableParallelProcessing: true,
      enableContextEnrichment: true,
      maxHistoryItems: 5
    };

    logger.info('Compliance orchestrator initialized', {
      maxProcessingTimeMs: this.config.maxProcessingTimeMs,
      enableParallelProcessing: this.config.enableParallelProcessing,
      enableContextEnrichment: this.config.enableContextEnrichment
    });
  }

  public static getInstance(): ComplianceOrchestratorService {
    if (!ComplianceOrchestratorService.instance) {
      ComplianceOrchestratorService.instance = new ComplianceOrchestratorService();
    }
    return ComplianceOrchestratorService.instance;
  }

  // Main orchestration method
  public async processComplianceRequest(
    request: ComplianceAskRequest
  ): Promise<Result<ComplianceResponse, Error>> {
    const startTime = Date.now();
    const requestId = uuidv4();
    const conversationId = uuidv4();

    logger.info('Starting compliance request processing', {
      requestId,
      conversationId,
      userId: request.userId,
      organizationId: request.organizationId.toString(),
      questionLength: request.question.length,
      framework: request.context?.currentProgram
    });

    try {
      // Step 1: Gather context data (parallel operations)
      const contextResult = await this.gatherContext(request, requestId);

      if (!contextResult.success) {
        return { success: false, error: (contextResult as any).error };
      }

      const dataGatheringTime = Date.now() - startTime;

      // Step 2: Generate AI prompt and process
      const aiStartTime = Date.now();
      const aiResult = await this.processWithAI(request, contextResult.data, requestId);

      if (!aiResult.success) {
        return { success: false, error: (aiResult as any).error };
      }

      const aiProcessingTime = Date.now() - aiStartTime;

      // Step 3: Build response with metadata
      const response = this.buildResponse(
        conversationId,
        request,
        aiResult.data,
        contextResult.data,
        aiProcessingTime
      );

      // Step 4: Save to conversation history (async, don't wait)
      const historySaveTime = Date.now();
      this.saveToHistory(request, response, historySaveTime);

      const totalTime = Date.now() - startTime;

      // Log performance metrics
      this.logPerformanceMetrics({
        totalTime,
        dataGatheringTime,
        aiProcessingTime,
        historySaveTime: Date.now() - historySaveTime,
        parallelOperations: this.countParallelOperations(contextResult.data)
      });

      // Check performance target
      if (totalTime > this.config.maxProcessingTimeMs) {
        logger.warn('Processing exceeded target time', {
          requestId,
          totalTime,
          target: this.config.maxProcessingTimeMs,
          exceeded: totalTime - this.config.maxProcessingTimeMs
        });
      }

      logger.info('Compliance request processed successfully', {
        requestId,
        conversationId,
        totalTime,
        aiProcessingTime,
        responseLength: response.answer.length
      });

      return { success: true, data: response };
    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown processing error';

      logger.error('Compliance request processing failed', {
        requestId,
        conversationId,
        totalTime,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined
      });

      if (totalTime > this.config.maxProcessingTimeMs) {
        return {
          success: false,
          error: createTimeoutError('Compliance request processing', totalTime)
        };
      }

      return {
        success: false,
        error: createInternalServerError(errorMessage, error instanceof Error ? error.stack : undefined)
      };
    }
  }

  // Gather all context data with parallel processing
  private async gatherContext(
    request: ComplianceAskRequest,
    requestId: string
  ): Promise<Result<ContextGatheringResult, Error>> {
    const startTime = Date.now();

    try {
      if (!this.config.enableParallelProcessing) {
        return await this.gatherContextSequentially(request);
      }

      // Parallel context gathering for optimal performance
      const [
        tenantResult,
        userDataResult,
        conversationHistoryResult,
        complianceStatusResult,
        userContextResult,
        organizationInsightsResult,
        frameworkGuidanceResult
      ] = await Promise.allSettled([
        // Core data (required)
        this.mysqlService.getOrganizationContext(request.organizationId),

        // User compliance data
        this.mysqlService.getUserComplianceData(request.userId, request.organizationId),

        // Conversation history
        this.getRecentConversationHistory(request.userId, request.organizationId),

        // Optional context enrichment (graceful degradation)
        ...(this.config.enableContextEnrichment ? [
          this.apptegaAPIService.getComplianceStatus(
            request.organizationId,
            request.context?.currentProgram
          ),
          this.apptegaAPIService.getUserContext(request.userId, request.organizationId),
          this.apptegaAPIService.getOrganizationInsights(request.organizationId),
          this.getFrameworkGuidance(request.context?.currentProgram)
        ] : [
          Promise.resolve({ success: true, data: null }),
          Promise.resolve({ success: true, data: null }),
          Promise.resolve({ success: true, data: null }),
          Promise.resolve({ success: true, data: null })
        ])
      ]);

      const duration = Date.now() - startTime;

      // Process results - core data must succeed
      const tenantContext = this.extractResult(tenantResult, 'tenant context');
      const userData = this.extractResult(userDataResult, 'user data', false); // Optional

      if (!tenantContext) {
        return {
          success: false,
          error: createInternalServerError('Failed to get tenant context - organization may not exist or be inactive')
        };
      }

      // Process optional results (graceful degradation)
      const conversationHistory = this.extractResult(conversationHistoryResult, 'conversation history', false) || [];
      const complianceStatus = this.extractResult(complianceStatusResult as any, 'compliance status', false);
      const userContext = this.extractResult(userContextResult as any, 'user context', false);
      const organizationInsights = this.extractResult(organizationInsightsResult as any, 'organization insights', false);
      const frameworkGuidance = this.extractResult(frameworkGuidanceResult as any, 'framework guidance', false);

      logger.info('Context gathering completed', {
        requestId,
        duration,
        tenantContextSuccess: !!tenantContext,
        userDataSuccess: !!userData,
        conversationHistoryCount: conversationHistory.length,
        complianceStatusSuccess: !!complianceStatus,
        userContextSuccess: !!userContext,
        organizationInsightsSuccess: !!organizationInsights,
        frameworkGuidanceSuccess: !!frameworkGuidance
      });

      return {
        success: true,
        data: {
          tenantContext,
          userComplianceData: userData,
          complianceStatus,
          userContext,
          organizationInsights,
          frameworkGuidance: frameworkGuidance as string | null,
          conversationHistory
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown context gathering error';

      logger.error('Context gathering failed', {
        requestId,
        duration,
        error: errorMessage
      });

      return {
        success: false,
        error: createInternalServerError(`Context gathering failed: ${errorMessage}`)
      };
    }
  }

  // Sequential context gathering (fallback)
  private async gatherContextSequentially(
    request: ComplianceAskRequest
  ): Promise<Result<ContextGatheringResult, Error>> {
    const tenantResult = await this.mysqlService.getOrganizationContext(request.organizationId);
    if (!tenantResult.success) {
      return { success: false, error: (tenantResult as any).error };
    }

    const userDataResult = await this.mysqlService.getUserComplianceData(
      request.userId,
      request.organizationId
    );

    const conversationHistory = await this.getRecentConversationHistory(
      request.userId,
      request.organizationId
    );

    return {
      success: true,
      data: {
        tenantContext: tenantResult.data,
        userComplianceData: userDataResult.success ? userDataResult.data : null,
        complianceStatus: null,
        userContext: null,
        organizationInsights: null,
        frameworkGuidance: null,
        conversationHistory: conversationHistory.success ? conversationHistory.data : []
      }
    };
  }

  // Process with AI using gathered context
  private async processWithAI(
    request: ComplianceAskRequest,
    contextData: ContextGatheringResult,
    requestId: string
  ): Promise<Result<string, Error>> {
    try {
      // Build conversation history summary
      const historySummary = this.promptService.generateHistorySummary(
        contextData.conversationHistory
      );

      // Generate AI prompt
      const prompt = this.promptService.buildCompliancePrompt({
        tenant: contextData.tenantContext!,
        user: contextData.userComplianceData || undefined,
        request,
        historySummary: historySummary || undefined
      });

      // Process with Bedrock
      const aiResult = await this.bedrockService.processRequest({
        prompt,
        model: 'claude-3-5-sonnet',
        maxTokens: 4096,
        temperature: 0.7,
        context: contextData.tenantContext!,
        userContext: contextData.userComplianceData || undefined
      });

      if (!aiResult.success) {
        logger.error('AI processing failed', {
          requestId,
          error: (aiResult as any).error.message
        });
        return { success: false, error: (aiResult as any).error };
      }

      logger.debug('AI processing completed', {
        requestId,
        tokensUsed: aiResult.data.tokensUsed,
        processingTime: aiResult.data.processingTimeMs,
        responseLength: aiResult.data.content.length
      });

      return { success: true, data: aiResult.data.content };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI processing error';

      logger.error('AI processing error', {
        requestId,
        error: errorMessage
      });

      return {
        success: false,
        error: createInternalServerError(`AI processing failed: ${errorMessage}`)
      };
    }
  }

  // Build final response with metadata
  private buildResponse(
    conversationId: string,
    request: ComplianceAskRequest,
    aiContent: string,
    contextData: ContextGatheringResult,
    aiProcessingTime: number
  ): ComplianceResponse {
    const metadata: ComplianceResponseMetadata = {
      dataSources: this.buildDataSources(contextData) as any,
      complianceFrameworks: this.buildFrameworks(request, contextData) as any,
      organizationContext: !!contextData.tenantContext,
      wordCount: this.countWords(aiContent),
      aiModel: 'claude-3-5-sonnet',
      confidenceScore: this.calculateConfidenceScore(contextData),
      relevantControls: this.buildRelevantControls(contextData),
      suggestedActions: this.extractSuggestedActions(aiContent)
    };

    return {
      answer: aiContent.trim(),
      conversationId,
      sessionId: request.sessionId,
      processingTime: `${aiProcessingTime}ms`,
      metadata
    };
  }

  // Save conversation to history (async, non-blocking)
  private saveToHistory(
    request: ComplianceAskRequest,
    response: ComplianceResponse,
    startTime: number
  ): void {
    // Fire and forget - don't block the response
    setImmediate(async () => {
      try {
        await this.dynamodbService.saveConversation(
          request.userId,
          request.organizationId,
          request.question,
          response
        );

        const duration = Date.now() - startTime;
        logger.debug('Conversation saved to history', {
          conversationId: response.conversationId,
          duration
        });
      } catch (error) {
        logger.warn('Failed to save conversation to history', {
          conversationId: response.conversationId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
  }

  // Helper methods
  private extractResult<T>(
    promiseResult: PromiseSettledResult<Result<T, Error>>,
    operationName: string,
    required: boolean = true
  ): T | null {
    if (promiseResult.status === 'rejected') {
      if (required) {
        logger.error(`${operationName} promise rejected`, {
          error: promiseResult.reason
        });
      } else {
        logger.warn(`${operationName} promise rejected (non-critical)`, {
          error: promiseResult.reason
        });
      }
      return null;
    }

    if (!promiseResult.value.success) {
      if (required) {
        logger.error(`${operationName} operation failed`, {
          error: (promiseResult.value as any).error.message
        });
      } else {
        logger.warn(`${operationName} operation failed (non-critical)`, {
          error: (promiseResult.value as any).error.message
        });
      }
      return null;
    }

    return promiseResult.value.data;
  }

  private async getRecentConversationHistory(
    userId: string,
    organizationId: number
  ): Promise<Result<ConversationSummary[], Error>> {
    try {
      const result = await this.dynamodbService.getConversationHistory({
        userId,
        organizationId,
        limit: this.config.maxHistoryItems
      });

      if (!result.success) {
        return { success: true, data: [] }; // Graceful degradation
      }

      const summaries: ConversationSummary[] = result.data.conversations.map(conv => ({
        conversationId: conv.id,
        question: conv.question,
        timestamp: conv.timestamp,
        topics: [...conv.topics]
      }));

      return { success: true, data: summaries };
    } catch (error) {
      logger.warn('Failed to get conversation history', {
        userId,
        organizationId: organizationId.toString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return { success: true, data: [] };
    }
  }

  private async getFrameworkGuidance(framework?: string): Promise<Result<string | null, Error>> {
    if (!framework) {
      return { success: true, data: null };
    }

    return await this.apptegaAPIService.getFrameworkGuidance(framework as any);
  }

  private buildDataSources(contextData: ContextGatheringResult): readonly string[] {
    const sources: string[] = ['bedrock_ai'];

    if (contextData.tenantContext) sources.push('mysql_context');
    if (contextData.userComplianceData) sources.push('apptega_controls');
    if (contextData.complianceStatus) sources.push('user_assessments');
    if (contextData.userContext) sources.push('one_api');
    if (contextData.organizationInsights) sources.push('web_api');

    return sources;
  }

  private buildFrameworks(
    request: ComplianceAskRequest,
    contextData: ContextGatheringResult
  ): readonly string[] {
    const frameworks: string[] = [];

    if (request.context?.currentProgram) {
      frameworks.push(request.context.currentProgram);
    }

    if (contextData.organizationInsights?.compliancePrograms) {
      contextData.organizationInsights.compliancePrograms.forEach(framework => {
        if (!frameworks.includes(framework)) {
          frameworks.push(framework);
        }
      });
    }

    return frameworks;
  }

  private calculateConfidenceScore(contextData: ContextGatheringResult): number {
    let score = 50; // Base score

    if (contextData.tenantContext) score += 15;
    if (contextData.userComplianceData) score += 15;
    if (contextData.complianceStatus) score += 10;
    if (contextData.userContext) score += 5;
    if (contextData.organizationInsights) score += 5;

    return Math.min(100, score);
  }

  private buildRelevantControls(contextData: ContextGatheringResult): any[] {
    if (!contextData.userComplianceData?.controls) {
      return [];
    }

    return contextData.userComplianceData.controls.slice(0, 5).map(control => ({
      frameworkId: control.frameworkId,
      controlId: control.controlNumber,
      controlTitle: control.controlTitle,
      implementationStatus: control.status,
      currentScore: control.implementationPercentage
    }));
  }

  private extractSuggestedActions(content: string): any[] {
    // Simple extraction of checkboxes from markdown
    const checkboxRegex = /- \[ \] \*\*(.*?)\*\*/g;
    const actions: any[] = [];
    let match;

    while ((match = checkboxRegex.exec(content)) !== null) {
      actions.push({
        action: match[1],
        priority: 'medium',
        estimatedEffort: 'TBD'
      });
    }

    return actions.slice(0, 5); // Limit to 5 actions
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).length;
  }

  private countParallelOperations(contextData: ContextGatheringResult): number {
    let count = 2; // Always tenant + user data
    if (contextData.complianceStatus) count++;
    if (contextData.userContext) count++;
    if (contextData.organizationInsights) count++;
    if (contextData.frameworkGuidance) count++;
    return count;
  }

  private logPerformanceMetrics(metrics: PerformanceMetrics): void {
    logger.performance('Compliance request processing metrics', metrics.totalTime, {
      dataGatheringTime: metrics.dataGatheringTime,
      aiProcessingTime: metrics.aiProcessingTime,
      historySaveTime: metrics.historySaveTime,
      parallelOperations: metrics.parallelOperations,
      isSlowRequest: metrics.totalTime > MONITORING_CONSTANTS.PERFORMANCE.WARNING_THRESHOLD_MS
    });

    if (metrics.totalTime > MONITORING_CONSTANTS.PERFORMANCE.ERROR_THRESHOLD_MS) {
      logger.error('Request exceeded error threshold', {
        totalTime: metrics.totalTime,
        threshold: MONITORING_CONSTANTS.PERFORMANCE.ERROR_THRESHOLD_MS
      });
    } else if (metrics.totalTime > MONITORING_CONSTANTS.PERFORMANCE.WARNING_THRESHOLD_MS) {
      logger.warn('Request exceeded warning threshold', {
        totalTime: metrics.totalTime,
        threshold: MONITORING_CONSTANTS.PERFORMANCE.WARNING_THRESHOLD_MS
      });
    }
  }
}
