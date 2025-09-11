/**
 * AWS Bedrock Service for AI integration with Claude models
 * Implements robust AI processing with retry logic and error handling
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import type {
  AIProcessingRequest,
  AIProcessingResponse,
  AIModel,
  Result
} from '@types';
import { logger, createBedrockServiceError, createTimeoutError, AI_CONSTANTS } from '@utils/index';

// Bedrock configuration interface
export interface BedrockConfig {
  readonly region: string;
  readonly accessKeyId: string;
  readonly secretAccessKey: string;
  readonly sessionToken?: string;
  readonly endpoint?: string;
}

// Claude request/response interfaces
export interface ClaudeRequest {
  readonly anthropic_version: string;
  readonly max_tokens: number;
  readonly messages: Array<{
    readonly role: 'user' | 'assistant';
    readonly content: string;
  }>;
  readonly temperature?: number;
  readonly top_p?: number;
  readonly stop_sequences?: readonly string[];
}

export interface ClaudeResponse {
  readonly id: string;
  readonly type: 'message';
  readonly role: 'assistant';
  readonly content: Array<{
    readonly type: 'text';
    readonly text: string;
  }>;
  readonly model: string;
  readonly stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  readonly stop_sequence: string | null;
  readonly usage: {
    readonly input_tokens: number;
    readonly output_tokens: number;
  };
}

// Retry configuration
interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly backoffMultiplier: number;
}

// Bedrock Service implementation
export class BedrockService {
  private static instance: BedrockService;
  private readonly client: BedrockRuntimeClient;
  private readonly defaultModel: string;
  private readonly fallbackModel: string;
  private readonly retryConfig: RetryConfig;

  private constructor() {
    const config: BedrockConfig = {
      region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
      sessionToken: process.env.AWS_SESSION_TOKEN || process.env.AWS_BEARER_TOKEN_BEDROCK
    };

    if (!config.accessKeyId || !config.secretAccessKey) {
      throw new Error('AWS credentials are required for Bedrock service');
    }

    this.defaultModel = process.env.BEDROCK_MODEL_ID || AI_CONSTANTS.BEDROCK.DEFAULT_MODEL;
    this.fallbackModel = AI_CONSTANTS.BEDROCK.FALLBACK_MODEL;

    this.retryConfig = {
      maxRetries: AI_CONSTANTS.BEDROCK.MAX_RETRIES,
      baseDelayMs: 1000,
      maxDelayMs: 8000,
      backoffMultiplier: 2
    };

    this.client = new BedrockRuntimeClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
        ...(config.sessionToken && { sessionToken: config.sessionToken })
      },
      ...(config.endpoint && { endpoint: config.endpoint })
    });

    logger.info('Bedrock service initialized', {
      region: config.region,
      defaultModel: this.defaultModel,
      fallbackModel: this.fallbackModel,
      maxRetries: this.retryConfig.maxRetries
    });
  }

  public static getInstance(): BedrockService {
    if (!BedrockService.instance) {
      BedrockService.instance = new BedrockService();
    }
    return BedrockService.instance;
  }

  // Process AI request with retry logic
  public async processRequest(request: AIProcessingRequest): Promise<Result<AIProcessingResponse, Error>> {
    const startTime = Date.now();
    const model = this.getModelId(request.model);

    logger.info('Starting AI processing', {
      model: request.model,
      promptLength: request.prompt.length,
      maxTokens: request.maxTokens || AI_CONSTANTS.BEDROCK.MAX_TOKENS,
      temperature: request.temperature || AI_CONSTANTS.BEDROCK.DEFAULT_TEMPERATURE
    });

    try {
      const result = await this.invokeModelWithRetry(request, model);

      if (!result.success) {
        // Try fallback model if primary model fails
        if (model !== this.fallbackModel) {
          logger.warn('Primary model failed, trying fallback model', {
            primaryModel: model,
            fallbackModel: this.fallbackModel,
            error: result.success ? 'Unexpected error' : (result as any).error.message
          });

          const fallbackResult = await this.invokeModelWithRetry(
            { ...request, model: 'claude-3-haiku' as AIModel },
            this.fallbackModel
          );

          if (fallbackResult.success) {
            return fallbackResult;
          }
        }

        return result;
      }

      const processingTimeMs = Date.now() - startTime;

      logger.info('AI processing completed successfully', {
        model: request.model,
        processingTimeMs,
        inputTokens: result.data.tokensUsed,
        outputLength: result.data.content.length,
        finishReason: result.data.finishReason
      });

      // Check for performance warnings
      if (processingTimeMs > AI_CONSTANTS.BEDROCK.TIMEOUT_MS / 2) {
        logger.warn('Slow AI processing detected', {
          processingTimeMs,
          threshold: AI_CONSTANTS.BEDROCK.TIMEOUT_MS / 2,
          model: request.model
        });
      }

      return result;
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown AI processing error';

      logger.error('AI processing failed', {
        model: request.model,
        processingTimeMs,
        error: errorMessage,
        promptLength: request.prompt.length
      });

      return {
        success: false,
        error: createBedrockServiceError(errorMessage)
      };
    }
  }

  // Invoke model with retry logic
  private async invokeModelWithRetry(
    request: AIProcessingRequest,
    modelId: string
  ): Promise<Result<AIProcessingResponse, Error>> {
    let lastError: Error = new Error('Unknown error');

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        const result = await this.invokeModel(request, modelId);

        if (result.success) {
          if (attempt > 0) {
            logger.info('AI processing succeeded after retry', {
              attempt,
              model: request.model
            });
          }
          return result;
        }

        lastError = (result as any).error;

        // Don't retry on certain error types
        if (this.shouldNotRetry((result as any).error)) {
          break;
        }

        if (attempt < this.retryConfig.maxRetries) {
          const delayMs = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelayMs
          );

          logger.warn('AI processing attempt failed, retrying', {
            attempt: attempt + 1,
            maxRetries: this.retryConfig.maxRetries,
            delayMs,
            error: result.success ? 'Unexpected error' : (result as any).error.message
          });

          await this.sleep(delayMs);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        if (attempt < this.retryConfig.maxRetries) {
          const delayMs = Math.min(
            this.retryConfig.baseDelayMs * Math.pow(this.retryConfig.backoffMultiplier, attempt),
            this.retryConfig.maxDelayMs
          );

          await this.sleep(delayMs);
        }
      }
    }

    return {
      success: false,
      error: createBedrockServiceError(`Failed after ${this.retryConfig.maxRetries + 1} attempts: ${lastError.message}`)
    };
  }

  // Invoke model once
  private async invokeModel(
    request: AIProcessingRequest,
    modelId: string
  ): Promise<Result<AIProcessingResponse, Error>> {
    const startTime = Date.now();

    try {
      const claudeRequest: ClaudeRequest = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: Math.min(request.maxTokens || AI_CONSTANTS.BEDROCK.MAX_TOKENS, 4096),
        messages: [
          {
            role: 'user',
            content: request.prompt
          }
        ],
        temperature: Math.max(0, Math.min(1, request.temperature || AI_CONSTANTS.BEDROCK.DEFAULT_TEMPERATURE)),
        top_p: 0.95,
        stop_sequences: ['Human:', 'Assistant:', '\n\nHuman:', '\n\nAssistant:']
      };

      const command = new InvokeModelCommand({
        modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(claudeRequest)
      });

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(createTimeoutError('Bedrock model invocation', AI_CONSTANTS.BEDROCK.TIMEOUT_MS));
        }, AI_CONSTANTS.BEDROCK.TIMEOUT_MS);
      });

      const result = await Promise.race([
        this.client.send(command),
        timeoutPromise
      ]);

      if (!result.body) {
        return {
          success: false,
          error: createBedrockServiceError('No response body from Bedrock')
        };
      }

      const responseText = new TextDecoder().decode(result.body);
      const claudeResponse: ClaudeResponse = JSON.parse(responseText);

      const processingTimeMs = Date.now() - startTime;

      // Extract text content
      const content = claudeResponse.content
        .filter(item => item.type === 'text')
        .map(item => item.text)
        .join('\n')
        .trim();

      if (!content) {
        return {
          success: false,
          error: createBedrockServiceError('Empty response content from Claude')
        };
      }

      const response: AIProcessingResponse = {
        content,
        model: request.model,
        tokensUsed: claudeResponse.usage.input_tokens + claudeResponse.usage.output_tokens,
        processingTimeMs,
        finishReason: this.mapFinishReason(claudeResponse.stop_reason)
      };

      return { success: true, data: response };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown Bedrock error';

      logger.error('Bedrock model invocation failed', {
        modelId,
        processingTimeMs,
        error: errorMessage
      });

      return {
        success: false,
        error: createBedrockServiceError(errorMessage)
      };
    }
  }

  // Map Claude finish reason to our standard format
  private mapFinishReason(stopReason: string | null): AIProcessingResponse['finishReason'] {
    switch (stopReason) {
      case 'end_turn':
        return 'stop';
      case 'max_tokens':
        return 'length';
      case 'stop_sequence':
        return 'stop';
      default:
        return 'stop';
    }
  }

  // Determine if error should not be retried
  private shouldNotRetry(error: Error): boolean {
    const nonRetryableErrors = [
      'ValidationException',
      'AccessDeniedException',
      'ResourceNotFoundException',
      'ModelNotReadyException'
    ];

    return nonRetryableErrors.some(nonRetryable =>
      error.message.includes(nonRetryable)
    );
  }

  // Get model ID based on AIModel type
  private getModelId(model: AIModel): string {
    switch (model) {
      case 'claude-3-5-sonnet':
        return this.defaultModel;
      case 'claude-3-haiku':
        return this.fallbackModel;
      case 'claude-3-opus':
        return 'anthropic.claude-3-opus-20240229-v1:0';
      default:
        return this.defaultModel;
    }
  }

  // Utility method for delays
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check method
  public async healthCheck(): Promise<Result<boolean, Error>> {
    const testRequest: AIProcessingRequest = {
      prompt: 'Hello, this is a health check. Please respond with "OK".',
      model: 'claude-3-haiku',
      maxTokens: 10,
      temperature: 0
    };

    try {
      const result = await this.processRequest(testRequest);

      if (result.success && result.data.content.toLowerCase().includes('ok')) {
        return { success: true, data: true };
      }

      return {
        success: false,
        error: new Error('Bedrock health check failed - unexpected response')
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Bedrock health check failed')
      };
    }
  }
}
