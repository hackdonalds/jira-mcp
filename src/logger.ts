import { LogEntry, LogLevel } from './types.ts';

export class Logger {
  private logs: LogEntry[] = [];
  private debugLevel: LogLevel = LogLevel.DEBUG;

  constructor(debugLevel?: string) {
    if (debugLevel) {
      this.debugLevel = debugLevel as LogLevel;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARNING, LogLevel.ERROR];
    const currentIndex = levels.indexOf(this.debugLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private createLogEntry(level: LogLevel, message: string, details?: any): LogEntry {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level,
      message,
      details
    };
    
    this.logs.push(entry);
    return entry;
  }

  debug(message: string, details?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const entry = this.createLogEntry(LogLevel.DEBUG, message, details);
      console.debug(`[${entry.timestamp.toISOString()}] DEBUG: ${message}`, details || '');
    }
  }

  info(message: string, details?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const entry = this.createLogEntry(LogLevel.INFO, message, details);
      console.info(`[${entry.timestamp.toISOString()}] INFO: ${message}`, details || '');
    }
  }

  warning(message: string, details?: any): void {
    if (this.shouldLog(LogLevel.WARNING)) {
      const entry = this.createLogEntry(LogLevel.WARNING, message, details);
      console.warn(`[${entry.timestamp.toISOString()}] WARNING: ${message}`, details || '');
    }
  }

  error(message: string, details?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const entry = this.createLogEntry(LogLevel.ERROR, message, details);
      console.error(`[${entry.timestamp.toISOString()}] ERROR: ${message}`, details || '');
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}