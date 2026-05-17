/**
 * Simple logger utility for platform package
 */

/* eslint-disable no-console */

// Declare console as global for Node.js environment
declare const console: {
  info: (message: string) => void;
  warn: (message: string) => void;
  error: (message: string) => void;
  log: (message: string) => void;
};

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string): void {
    this.log('INFO', message);
  }

  warn(message: string): void {
    this.log('WARN', message);
  }

  error(message: string, error?: unknown): void {
    this.log('ERROR', message);
    if (error) {
      this.log('ERROR', String(error));
    }
  }

  debug(message: string): void {
    this.log('DEBUG', message);
  }

  private log(level: string, message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] [${this.context}] ${message}`;
    
    // Use console for logging (available in Node.js)
    if (level === 'ERROR') {
      console.error(logMessage);
    } else if (level === 'WARN') {
      console.warn(logMessage);
    } else {
      console.info(logMessage);
    }
  }
}

export function createLogger(context: string): Logger {
  return new Logger(context);
}

// Made with Bob
