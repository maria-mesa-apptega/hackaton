/**
 * MySQL Service for connecting to existing Apptega database
 * Implements connection pooling and multi-tenant data access patterns
 */

import mysql from 'mysql2/promise';
import type { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import type {
  TenantContext,
  UserComplianceData,
  ComplianceTask,
  Assessment,
  Control,
  Result
} from '@types';
import { logger, createMySQLConnectionError, DATABASE_CONSTANTS } from '@utils/index';

// Database connection interface
export interface DatabaseConfig {
  readonly host: string;
  readonly username: string;
  readonly password: string;
  readonly database: string;
  readonly port: number;
  readonly connectionLimit: number;
  readonly acquireTimeout: number;
  readonly timeout: number;
  readonly idleTimeout: number;
  readonly timezone: string;
}

// Query result interfaces
export interface OrganizationData extends RowDataPacket {
  readonly id: number;
  readonly name: string;
  readonly partner_id: number | null;
  readonly industry: string | null;
  readonly status: 'active' | 'inactive' | 'suspended';
  readonly created_at: string;
  readonly updated_at: string;
}

export interface UserData extends RowDataPacket {
  readonly id: string;
  readonly organization_id: number;
  readonly email: string;
  readonly name: string;
  readonly role: string;
  readonly status: 'active' | 'inactive' | 'suspended';
  readonly created_at: string;
  readonly updated_at: string;
}

export interface ComplianceControlData extends RowDataPacket {
  readonly id: string;
  readonly organization_id: number;
  readonly control_number: string;
  readonly control_title: string;
  readonly framework_id: string;
  readonly status: 'not_implemented' | 'in_progress' | 'implemented' | 'compliant';
  readonly implementation_percentage: number;
  readonly evidence_count: number;
  readonly last_updated: string;
}

export interface AssessmentData extends RowDataPacket {
  readonly id: string;
  readonly organization_id: number;
  readonly name: string;
  readonly framework_id: string;
  readonly completion_date: string | null;
  readonly score: number;
  readonly status: 'draft' | 'completed' | 'under_review' | 'approved';
  readonly created_at: string;
  readonly updated_at: string;
}

// MySQL Service implementation
export class MySQLService {
  private static instance: MySQLService;
  private pool: Pool | null = null;
  private readonly config: DatabaseConfig;

  private constructor() {
    this.config = {
      host: process.env.DB_HOST || 'localhost',
      username: process.env.DB_USERNAME || 'apptega',
      password: process.env.DB_PASSWORD || 'apptega123',
      database: process.env.DB_DATABASE || 'apptega',
      port: parseInt(process.env.DB_HOST_PORT || '3306', 10),
      connectionLimit: DATABASE_CONSTANTS.MYSQL.CONNECTION_LIMIT,
      acquireTimeout: DATABASE_CONSTANTS.MYSQL.ACQUIRE_TIMEOUT,
      timeout: DATABASE_CONSTANTS.MYSQL.CONNECTION_TIMEOUT,
      idleTimeout: DATABASE_CONSTANTS.MYSQL.IDLE_TIMEOUT,
      timezone: '+00:00'
    };
  }

  public static getInstance(): MySQLService {
    if (!MySQLService.instance) {
      MySQLService.instance = new MySQLService();
    }
    return MySQLService.instance;
  }

  private async initializePool(): Promise<Pool> {
    if (!this.pool) {
      try {
        this.pool = mysql.createPool({
          host: this.config.host,
          user: this.config.username,
          password: this.config.password,
          database: this.config.database,
          port: this.config.port,
          connectionLimit: this.config.connectionLimit,
          timeout: this.config.timeout,
          idleTimeout: this.config.idleTimeout,
          timezone: this.config.timezone,
          ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
          multipleStatements: false,
          namedPlaceholders: true
        } as any);

        logger.info('MySQL connection pool initialized', {
          host: this.config.host,
          database: this.config.database,
          connectionLimit: this.config.connectionLimit
        });
      } catch (error) {
        logger.error('Failed to initialize MySQL connection pool', {
          error: error instanceof Error ? error.message : 'Unknown error',
          config: {
            host: this.config.host,
            database: this.config.database,
            port: this.config.port
          }
        });
        throw error;
      }
    }
    return this.pool;
  }

  public async query<T extends RowDataPacket[]>(
    sql: string,
    params: Record<string, unknown> = {}
  ): Promise<Result<T, Error>> {
    const startTime = Date.now();
    let connection: PoolConnection | null = null;

    try {
      const pool = await this.initializePool();
      connection = await pool.getConnection();

      logger.debug('Executing MySQL query', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        paramCount: Object.keys(params).length
      });

      const [rows] = await connection.execute<T>(sql, params);
      const duration = Date.now() - startTime;

      logger.debug('MySQL query completed', {
        duration,
        rowCount: rows.length
      });

      if (duration > DATABASE_CONSTANTS.MYSQL.QUERY_TIMEOUT / 2) {
        logger.warn('Slow MySQL query detected', {
          sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
          duration,
          threshold: DATABASE_CONSTANTS.MYSQL.QUERY_TIMEOUT / 2
        });
      }

      return { success: true, data: rows };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';

      logger.error('MySQL query failed', {
        sql: sql.substring(0, 100) + (sql.length > 100 ? '...' : ''),
        error: errorMessage,
        duration,
        paramCount: Object.keys(params).length
      });

      return {
        success: false,
        error: createMySQLConnectionError(errorMessage)
      };
    } finally {
      if (connection) {
        connection.release();
      }
    }
  }

  // Get organization context for multi-tenant isolation
  public async getOrganizationContext(organizationId: number): Promise<Result<TenantContext, Error>> {
    const sql = `
      SELECT
        o.id,
        o.name,
        o.industry,
        o.status,
        p.name as partner_name,
        p.type as partner_type
      FROM organizations o
      LEFT JOIN partners p ON o.partner_id = p.id
      WHERE o.id = :organizationId AND o.status = 'active'
    `;

    const result = await this.query<OrganizationData[]>(sql, { organizationId });

    if (!result.success) {
      return { success: false, error: (result as any).error };
    }

    if (result.data.length === 0) {
      return {
        success: false,
        error: new Error(`Organization not found or inactive: ${organizationId}`)
      };
    }

    const org = result.data[0];
    const tenantContext: TenantContext = {
      organizationId: org.id,
      organizationName: org.name,
      industry: org.industry as TenantContext['industry'],
      partnerName: org.partner_name || undefined,
      partnerType: org.partner_type || undefined,
      activeFrameworks: [] // Will be populated by separate query
    };

    return { success: true, data: tenantContext };
  }

  // Get user data with organization validation
  public async getUserData(userId: string, organizationId: number): Promise<Result<UserData, Error>> {
    const sql = `
      SELECT
        u.id,
        u.organization_id,
        u.email,
        u.name,
        u.role,
        u.status,
        u.created_at,
        u.updated_at
      FROM users u
      WHERE u.id = :userId
        AND u.organization_id = :organizationId
        AND u.status = 'active'
    `;

    const result = await this.query<UserData[]>(sql, { userId, organizationId });

    if (!result.success) {
      return { success: false, error: (result as any).error };
    }

    if (result.data.length === 0) {
      return {
        success: false,
        error: new Error(`User not found or not in organization: ${userId}`)
      };
    }

    return { success: true, data: result.data[0] };
  }

  // Get compliance controls for organization
  public async getComplianceControls(organizationId: number): Promise<Result<Control[], Error>> {
    const sql = `
      SELECT
        cc.id,
        cc.control_number,
        cc.control_title,
        cc.framework_id,
        cc.status,
        cc.implementation_percentage,
        cc.evidence_count,
        cc.last_updated
      FROM compliance_controls cc
      WHERE cc.organization_id = :organizationId
      ORDER BY cc.framework_id, cc.control_number
    `;

    const result = await this.query<ComplianceControlData[]>(sql, { organizationId });

    if (!result.success) {
      return { success: false, error: (result as any).error };
    }

    const controls: Control[] = result.data.map(row => ({
      id: row.id,
      controlNumber: row.control_number,
      controlTitle: row.control_title,
      status: row.status,
      frameworkId: row.framework_id as Control['frameworkId'],
      implementationPercentage: row.implementation_percentage,
      evidenceCount: row.evidence_count,
      lastUpdated: row.last_updated
    }));

    return { success: true, data: controls };
  }

  // Get assessments for organization
  public async getAssessments(organizationId: number): Promise<Result<Assessment[], Error>> {
    const sql = `
      SELECT
        a.id,
        a.name,
        a.framework_id,
        a.completion_date,
        a.score,
        a.status,
        a.created_at,
        a.updated_at
      FROM assessments a
      WHERE a.organization_id = :organizationId
      ORDER BY a.created_at DESC
    `;

    const result = await this.query<AssessmentData[]>(sql, { organizationId });

    if (!result.success) {
      return { success: false, error: (result as any).error };
    }

    const assessments: Assessment[] = result.data.map(row => ({
      id: row.id,
      name: row.name,
      frameworkId: row.framework_id as Assessment['frameworkId'],
      completionDate: row.completion_date || '',
      score: row.score,
      status: row.status
    }));

    return { success: true, data: assessments };
  }

  // Get user compliance data (tasks, controls, assessments)
  public async getUserComplianceData(
    userId: string,
    organizationId: number
  ): Promise<Result<UserComplianceData, Error>> {
    // Get assigned tasks
    const tasksResult = await this.getAssignedTasks(userId, organizationId);
    if (!tasksResult.success) {
      return { success: false, error: (tasksResult as any).error };
    }

    // Get assessments
    const assessmentsResult = await this.getAssessments(organizationId);
    if (!assessmentsResult.success) {
      return { success: false, error: (assessmentsResult as any).error };
    }

    // Get controls
    const controlsResult = await this.getComplianceControls(organizationId);
    if (!controlsResult.success) {
      return { success: false, error: (controlsResult as any).error };
    }

    const userComplianceData: UserComplianceData = {
      userId,
      organizationId,
      assignedTasks: tasksResult.data,
      completedAssessments: assessmentsResult.data,
      controls: controlsResult.data
    };

    return { success: true, data: userComplianceData };
  }

  // Get assigned tasks for user
  private async getAssignedTasks(
    userId: string,
    organizationId: number
  ): Promise<Result<ComplianceTask[], Error>> {
    const sql = `
      SELECT
        ct.id,
        ct.title,
        ct.status,
        ct.due_date,
        ct.control_id,
        ct.framework_id
      FROM compliance_tasks ct
      WHERE ct.assigned_to = :userId
        AND ct.organization_id = :organizationId
      ORDER BY
        CASE ct.status
          WHEN 'overdue' THEN 1
          WHEN 'pending' THEN 2
          WHEN 'in_progress' THEN 3
          WHEN 'completed' THEN 4
        END,
        ct.due_date ASC
    `;

    const result = await this.query<any[]>(sql, { userId, organizationId });

    if (!result.success) {
      return { success: false, error: (result as any).error };
    }

    const tasks: ComplianceTask[] = result.data.map(row => ({
      id: row.id,
      title: row.title,
      status: row.status,
      dueDate: row.due_date || undefined,
      controlId: row.control_id || undefined,
      frameworkId: row.framework_id || undefined
    }));

    return { success: true, data: tasks };
  }

  // Health check method
  public async healthCheck(): Promise<Result<boolean, Error>> {
    try {
      const result = await this.query<any[]>('SELECT 1 as health_check');
      return {
        success: true,
        data: result.success && result.data.length > 0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error('Health check failed')
      };
    }
  }

  // Cleanup method for graceful shutdown
  public async cleanup(): Promise<void> {
    if (this.pool) {
      logger.info('Closing MySQL connection pool');
      await this.pool.end();
      this.pool = null;
    }
  }
}
