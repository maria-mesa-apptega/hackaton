/**
 * DynamoDB Service for conversation history management
 * Implements NoSQL patterns for conversation storage and retrieval
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import type {
  ConversationRecord,
  ConversationHistoryItem,
  ConversationHistoryResponse,
  ComplianceResponse,
  UserId,
  OrganizationId,
  ConversationId,
  Result
} from '@types/index';
import { logger, createDynamoDBServiceError, DATABASE_CONSTANTS } from '@utils/index';

// DynamoDB configuration interface
export interface DynamoDBConfig {
  readonly region: string;
  readonly tableName: string;
  readonly endpoint?: string; // For local development
}

// Query parameters for conversation history
export interface ConversationQueryParams {
  readonly userId: UserId;
  readonly organizationId: OrganizationId;
  readonly limit?: number;
  readonly cursor?: string;
  readonly startDate?: string;
  readonly endDate?: string;
}

// DynamoDB Service implementation
export class DynamoDBService {
  private static instance: DynamoDBService;
  private readonly client: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;

  private constructor() {
    const config: DynamoDBConfig = {
      region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
      tableName: process.env.DYNAMODB_TABLE_NAME || 'apptega-compliance-copilot-conversations-dev',
      endpoint: process.env.DYNAMODB_ENDPOINT // For serverless-offline
    };

    this.tableName = config.tableName;

    this.client = new DynamoDBClient({
      region: config.region,
      ...(config.endpoint && { endpoint: config.endpoint })
    });

    this.docClient = DynamoDBDocumentClient.from(this.client, {
      marshallOptions: {
        convertEmptyValues: false,
        removeUndefinedValues: true,
        convertClassInstanceToMap: false
      },
      unmarshallOptions: {
        wrapNumbers: false
      }
    });

    logger.info('DynamoDB service initialized', {
      region: config.region,
      tableName: config.tableName,
      endpoint: config.endpoint
    });
  }

  public static getInstance(): DynamoDBService {
    if (!DynamoDBService.instance) {
      DynamoDBService.instance = new DynamoDBService();
    }
    return DynamoDBService.instance;
  }

  // Save conversation to DynamoDB
  public async saveConversation(
    userId: UserId,
    organizationId: OrganizationId,
    question: string,
    response: ComplianceResponse
  ): Promise<Result<ConversationRecord, Error>> {
    const conversationId = response.conversationId || uuidv4();
    const timestamp = new Date().toISOString();
    const sortKey = `CONVERSATION#${timestamp}#${conversationId}`;

    const record: ConversationRecord = {
      PK: `USER#${userId}`,
      SK: sortKey,
      GSI1PK: `ORG#${organizationId}`,
      GSI1SK: `CONVERSATION#${timestamp}`,
      conversationId,
      userId,
      organizationId,
      sessionId: response.sessionId,
      question,
      answer: response.answer,
      metadata: response.metadata,
      processingTimeMs: parseInt(response.processingTime.replace('ms', '').replace('s', '000'), 10),
      createdAt: timestamp,
      updatedAt: timestamp,
      ttl: Math.floor(Date.now() / 1000) + (DATABASE_CONSTANTS.DYNAMODB.DEFAULT_TTL_DAYS * 24 * 60 * 60)
    };

    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: record,
        ConditionExpression: 'attribute_not_exists(PK) AND attribute_not_exists(SK)'
      });

      await this.docClient.send(command);

      logger.info('Conversation saved to DynamoDB', {
        conversationId,
        userId,
        organizationId,
        questionLength: question.length,
        answerLength: response.answer.length
      });

      return { success: true, data: record };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown DynamoDB error';

      logger.error('Failed to save conversation to DynamoDB', {
        conversationId,
        userId,
        organizationId,
        error: errorMessage
      });

      return {
        success: false,
        error: createDynamoDBServiceError(errorMessage)
      };
    }
  }

  // Get conversation by ID
  public async getConversation(
    userId: UserId,
    conversationId: ConversationId
  ): Promise<Result<ConversationRecord | null, Error>> {
    try {
      // We need to query by GSI1PK and filter by conversationId since we don't have the full SK
      const queryCommand = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        FilterExpression: 'conversationId = :conversationId',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':conversationId': conversationId
        },
        Limit: 1
      });

      const result = await this.docClient.send(queryCommand);

      if (!result.Items || result.Items.length === 0) {
        logger.info('Conversation not found', { conversationId, userId });
        return { success: true, data: null };
      }

      const conversation = result.Items[0] as ConversationRecord;

      logger.debug('Conversation retrieved from DynamoDB', {
        conversationId,
        userId,
        createdAt: conversation.createdAt
      });

      return { success: true, data: conversation };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown DynamoDB error';

      logger.error('Failed to get conversation from DynamoDB', {
        conversationId,
        userId,
        error: errorMessage
      });

      return {
        success: false,
        error: createDynamoDBServiceError(errorMessage)
      };
    }
  }

  // Get conversation history for user
  public async getConversationHistory(
    params: ConversationQueryParams
  ): Promise<Result<ConversationHistoryResponse, Error>> {
    const limit = Math.min(params.limit || 20, DATABASE_CONSTANTS.DYNAMODB.MAX_QUERY_LIMIT);

    try {
      let keyConditionExpression = 'PK = :pk';
      const expressionAttributeValues: Record<string, any> = {
        ':pk': `USER#${params.userId}`
      };

      // Add date range filtering if provided
      if (params.startDate && params.endDate) {
        keyConditionExpression += ' AND SK BETWEEN :startSK AND :endSK';
        expressionAttributeValues[':startSK'] = `CONVERSATION#${params.startDate}`;
        expressionAttributeValues[':endSK'] = `CONVERSATION#${params.endDate}#Z`; // Z for lexicographic ordering
      } else {
        keyConditionExpression += ' AND begins_with(SK, :skPrefix)';
        expressionAttributeValues[':skPrefix'] = 'CONVERSATION#';
      }

      const queryCommand = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: keyConditionExpression,
        ExpressionAttributeValues: expressionAttributeValues,
        ScanIndexForward: false, // Most recent first
        Limit: limit,
        ...(params.cursor && { ExclusiveStartKey: JSON.parse(Buffer.from(params.cursor, 'base64').toString()) })
      });

      const result = await this.docClient.send(queryCommand);

      if (!result.Items) {
        return {
          success: true,
          data: {
            conversations: [],
            totalCount: 0
          }
        };
      }

      // Transform DynamoDB items to ConversationHistoryItem
      const conversations: ConversationHistoryItem[] = result.Items.map((item: any) => {
        const record = item as ConversationRecord;
        return {
          id: record.conversationId,
          question: record.question,
          answerPreview: this.createAnswerPreview(record.answer),
          timestamp: record.createdAt,
          topics: this.extractTopicsFromMetadata(record.metadata),
          frameworks: record.metadata.complianceFrameworks,
          processingTime: `${record.processingTimeMs}ms`,
          wordCount: record.metadata.wordCount
        };
      });

      // Generate cursor for pagination
      let nextCursor: string | undefined;
      if (result.LastEvaluatedKey) {
        nextCursor = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      }

      logger.info('Conversation history retrieved', {
        userId: params.userId,
        organizationId: params.organizationId,
        conversationCount: conversations.length,
        hasNextPage: !!nextCursor
      });

      return {
        success: true,
        data: {
          conversations,
          totalCount: conversations.length, // Note: DynamoDB doesn't provide total count efficiently
          nextCursor
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown DynamoDB error';

      logger.error('Failed to get conversation history from DynamoDB', {
        userId: params.userId,
        organizationId: params.organizationId,
        error: errorMessage
      });

      return {
        success: false,
        error: createDynamoDBServiceError(errorMessage)
      };
    }
  }

  // Get organization conversation history (via GSI)
  public async getOrganizationConversationHistory(
    organizationId: OrganizationId,
    limit: number = 20
  ): Promise<Result<ConversationHistoryItem[], Error>> {
    try {
      const queryCommand = new QueryCommand({
        TableName: this.tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1skPrefix)',
        ExpressionAttributeValues: {
          ':gsi1pk': `ORG#${organizationId}`,
          ':gsi1skPrefix': 'CONVERSATION#'
        },
        ScanIndexForward: false,
        Limit: Math.min(limit, DATABASE_CONSTANTS.DYNAMODB.MAX_QUERY_LIMIT)
      });

      const result = await this.docClient.send(queryCommand);

      if (!result.Items) {
        return { success: true, data: [] };
      }

      const conversations: ConversationHistoryItem[] = result.Items.map((item: any) => {
        const record = item as ConversationRecord;
        return {
          id: record.conversationId,
          question: record.question,
          answerPreview: this.createAnswerPreview(record.answer),
          timestamp: record.createdAt,
          topics: this.extractTopicsFromMetadata(record.metadata),
          frameworks: record.metadata.complianceFrameworks,
          processingTime: `${record.processingTimeMs}ms`,
          wordCount: record.metadata.wordCount
        };
      });

      logger.info('Organization conversation history retrieved', {
        organizationId,
        conversationCount: conversations.length
      });

      return { success: true, data: conversations };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown DynamoDB error';

      logger.error('Failed to get organization conversation history', {
        organizationId,
        error: errorMessage
      });

      return {
        success: false,
        error: createDynamoDBServiceError(errorMessage)
      };
    }
  }

  // Delete conversation
  public async deleteConversation(
    userId: UserId,
    conversationId: ConversationId
  ): Promise<Result<boolean, Error>> {
    try {
      // First get the conversation to find the exact SK
      const getResult = await this.getConversation(userId, conversationId);

      if (!getResult.success || !getResult.data) {
        return getResult.success
          ? { success: false, error: new Error('Conversation not found') }
          : { success: false, error: getResult.error };
      }

      const deleteCommand = new DeleteCommand({
        TableName: this.tableName,
        Key: {
          PK: getResult.data.PK,
          SK: getResult.data.SK
        }
      });

      await this.docClient.send(deleteCommand);

      logger.info('Conversation deleted from DynamoDB', {
        conversationId,
        userId
      });

      return { success: true, data: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown DynamoDB error';

      logger.error('Failed to delete conversation from DynamoDB', {
        conversationId,
        userId,
        error: errorMessage
      });

      return {
        success: false,
        error: createDynamoDBServiceError(errorMessage)
      };
    }
  }

  // Health check method
  public async healthCheck(): Promise<Result<boolean, Error>> {
    try {
      // Simple query to test connection
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': 'HEALTH_CHECK'
        },
        Limit: 1
      });

      await this.docClient.send(command);
      return { success: true, data: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('DynamoDB health check failed')
      };
    }
  }

  // Helper methods
  private createAnswerPreview(answer: string): string {
    // Remove markdown formatting and truncate to 150 characters
    const plainText = answer
      .replace(/#{1,6}\s?/g, '') // Remove headers
      .replace(/\*{1,2}(.*?)\*{1,2}/g, '$1') // Remove bold/italic
      .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove code
      .replace(/\[(.*?)\]\(.*?\)/g, '$1') // Remove links
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim();

    return plainText.length > 150 ? `${plainText.substring(0, 147)}...` : plainText;
  }

  private extractTopicsFromMetadata(metadata: any): string[] {
    // Extract topics from the compliance frameworks and relevant controls
    const topics: string[] = [];

    if (metadata.complianceFrameworks) {
      topics.push(...metadata.complianceFrameworks);
    }

    if (metadata.relevantControls) {
      metadata.relevantControls.forEach((control: any) => {
        if (control.controlId && !topics.includes(control.controlId)) {
          topics.push(control.controlId);
        }
      });
    }

    // Extract topics from suggested actions
    if (metadata.suggestedActions) {
      metadata.suggestedActions.forEach((action: any) => {
        if (action.action) {
          const actionWords = action.action.split(' ').slice(0, 2); // First two words
          topics.push(actionWords.join(' '));
        }
      });
    }

    return topics.slice(0, 5); // Limit to 5 topics
  }
}
