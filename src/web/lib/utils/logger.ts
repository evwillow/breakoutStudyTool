/**
 * @fileoverview Centralized client/server logger wrapper for consistent logging output.
 * @module src/web/lib/utils/logger.ts
 * @dependencies console
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Simple logger implementation for application logging.
 * This replaces the more complex logger to simplify usage.
 */
export class Logger {
  private context: string;
  private metadata?: Record<string, any>;

  constructor(context: string, metadata?: Record<string, any>) {
    this.context = context;
    this.metadata = metadata;
  }

  createChildLogger(metadata: Record<string, any>): Logger {
    return new Logger(this.context, { ...this.metadata, ...metadata });
  }

  info(message: string, data?: any) {
    console.log(`[INFO] [${this.context}] ${message}`, data || '', this.metadata || '');
  }

  warn(message: string, data?: any) {
    console.warn(`[WARN] [${this.context}] ${message}`, data || '', this.metadata || '');
  }

  error(message: string, error?: any, additionalData?: any) {
    console.error(
      `[ERROR] [${this.context}] ${message}`, 
      error || '', 
      additionalData || '', 
      this.metadata || ''
    );
  }

  debug(message: string, data?: any) {
    console.debug(`[DEBUG] [${this.context}] ${message}`, data || '', this.metadata || '');
  }
}

// Backwards compatibility with any existing logger usage
export const logger = new Logger('app'); 