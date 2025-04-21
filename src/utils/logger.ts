/**
 * Simple logger implementation for application logging.
 * This replaces the more complex logger to simplify usage.
 */
export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, data?: any) {
    console.log(`[INFO] [${this.context}] ${message}`, data || '');
  }

  warn(message: string, data?: any) {
    console.warn(`[WARN] [${this.context}] ${message}`, data || '');
  }

  error(message: string, error?: any) {
    console.error(`[ERROR] [${this.context}] ${message}`, error || '');
  }

  debug(message: string, data?: any) {
    console.debug(`[DEBUG] [${this.context}] ${message}`, data || '');
  }
}

// Backwards compatibility with any existing logger usage
export const logger = new Logger('app'); 