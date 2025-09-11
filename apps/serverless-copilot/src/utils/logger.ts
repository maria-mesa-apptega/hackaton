/**
 * Winston logger configuration with AWS Lambda optimizations
 * Provides structured logging with proper types
 */

import winston from 'winston';
import type { ErrorContext } from '@types';

// Log levels enum for type safety
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

// Log context interface
export interface LogContext {
  readonly requestId?: string;
  readonly userId?: string;
  readonly organizationId?: string;
  readonly functionName?: string;
  readonly correlationId?: string;
  readonly duration?: number;
  readonly [key: string]: unknown;
}

// Logger interface for dependency injection
export interface ILogger {
  error: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  debug: (message: string, context?: LogContext) => void;
  logError: (error: Error, context?: ErrorContext) => void;
}

class Logger implements ILogger {
  private readonly logger: winston.Logger;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || LogLevel.INFO;

    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: {
        service: process.env.SERVICE_NAME || 'apptega-compliance-copilot',
        stage: process.env.STAGE || 'dev',
        region: process.env.AWS_REGION || 'us-east-1'
      },
      transports: [
        new winston.transports.Console()
      ]
    });

    // Add request ID if available from Lambda context
    if (process.env.AWS_REQUEST_ID) {
      this.logger.defaultMeta.requestId = process.env.AWS_REQUEST_ID;
    }
  }

  public error(message: string, context: LogContext = {}): void {
    this.logger.error(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  public warn(message: string, context: LogContext = {}): void {
    this.logger.warn(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  public info(message: string, context: LogContext = {}): void {
    this.logger.info(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  public debug(message: string, context: LogContext = {}): void {
    this.logger.debug(message, {
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  public logError(error: Error, context: ErrorContext = { timestamp: new Date().toISOString() }): void {
    this.logger.error('Error occurred', {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      timestamp: new Date().toISOString()
    });
  }

  // Method for logging performance metrics
  public performance(operation: string, durationMs: number, context: LogContext = {}): void {
    this.logger.info('Performance metric', {
      operation,
      durationMs,
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  // Method for logging business events
  public businessEvent(event: string, data: Record<string, unknown>, context: LogContext = {}): void {
    this.logger.info('Business event', {
      event,
      data,
      ...context,
      timestamp: new Date().toISOString()
    });
  }

  // Method for security-related logging
  public security(event: string, data: Record<string, unknown>, context: LogContext = {}): void {
    this.logger.warn('Security event', {
      event,
      data,
      ...context,
      timestamp: new Date().toISOString(),
      security: true
    });
  }
}

// Singleton instance
const logger = new Logger();

export default logger;
export { Logger };
