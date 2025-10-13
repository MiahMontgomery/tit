import { createWriteStream, existsSync, mkdirSync } from "fs";
import { join } from "path";

if (!process.env.FILE_STORAGE_DIR) {
  throw new Error("FILE_STORAGE_DIR environment variable is required");
}

const STORAGE_DIR = process.env.FILE_STORAGE_DIR;

export class Logger {
  private static instance: Logger;
  private logStream: NodeJS.WritableStream | null = null;

  private constructor() {
    this.initializeLogFile();
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private initializeLogFile(): void {
    try {
      // Ensure storage directory exists
      if (!existsSync(STORAGE_DIR)) {
        mkdirSync(STORAGE_DIR, { recursive: true });
      }

      const logFile = join(STORAGE_DIR, `titan-${new Date().toISOString().split('T')[0]}.log`);
      this.logStream = createWriteStream(logFile, { flags: 'a' });
      
      console.log(`✅ Logger initialized: ${logFile}`);
    } catch (error) {
      console.error("❌ Failed to initialize logger:", error);
    }
  }

  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] ${message}${metaStr}\n`;
  }

  private write(level: string, message: string, meta?: any): void {
    const formattedMessage = this.formatMessage(level, message, meta);
    
    // Write to console
    console.log(formattedMessage.trim());
    
    // Write to file
    if (this.logStream) {
      this.logStream.write(formattedMessage);
    }
  }

  info(message: string, meta?: any): void {
    this.write('INFO', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.write('WARN', message, meta);
  }

  error(message: string, meta?: any): void {
    this.write('ERROR', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.write('DEBUG', message, meta);
  }

  // Project-specific logging
  projectInfo(projectId: string, message: string, meta?: any): void {
    this.info(`[Project:${projectId}] ${message}`, meta);
  }

  projectError(projectId: string, message: string, meta?: any): void {
    this.error(`[Project:${projectId}] ${message}`, meta);
  }

  // Task-specific logging
  taskInfo(taskId: string, message: string, meta?: any): void {
    this.info(`[Task:${taskId}] ${message}`, meta);
  }

  taskError(taskId: string, message: string, meta?: any): void {
    this.error(`[Task:${taskId}] ${message}`, meta);
  }

  // System logging
  systemInfo(message: string, meta?: any): void {
    this.info(`[System] ${message}`, meta);
  }

  systemError(message: string, meta?: any): void {
    this.error(`[System] ${message}`, meta);
  }

  // Performance logging
  performance(operation: string, duration: number, meta?: any): void {
    this.info(`[Performance] ${operation} took ${duration}ms`, meta);
  }

  // API logging
  apiRequest(method: string, path: string, statusCode: number, duration: number): void {
    this.info(`[API] ${method} ${path} ${statusCode} ${duration}ms`);
  }

  apiError(method: string, path: string, error: string): void {
    this.error(`[API] ${method} ${path} - ${error}`);
  }

  // Database logging
  dbQuery(query: string, duration: number, meta?: any): void {
    this.debug(`[DB] Query executed in ${duration}ms`, { query, ...meta });
  }

  dbError(query: string, error: string): void {
    this.error(`[DB] Query failed: ${query}`, { error });
  }

  // Cleanup
  close(): void {
    if (this.logStream) {
      this.logStream.end();
      this.logStream = null;
    }
  }
}

export const logger = Logger.getInstance();
