interface LogMeta {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  private formatMessage(level: string, message: string, meta?: LogMeta): string {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaStr}`;
  }

  info(message: string, meta?: LogMeta): void {
    console.log(this.formatMessage('info', message, meta));
  }

  warn(message: string, meta?: LogMeta): void {
    console.warn(this.formatMessage('warn', message, meta));
  }

  error(message: string, meta?: LogMeta): void {
    console.error(this.formatMessage('error', message, meta));
  }

  debug(message: string, meta?: LogMeta): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, meta));
    }
  }
}

export const logger = new Logger();
