import {
  Injectable,
  LoggerService as NestLoggerService,
  Scope,
} from '@nestjs/common';

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService implements NestLoggerService {
  private context?: string;

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string) {
    const ctx = context || this.context || 'Application';
    console.log(`[${new Date().toISOString()}] [LOG] [${ctx}] ${message}`);
  }

  error(message: string, trace?: string, context?: string) {
    const ctx = context || this.context || 'Application';
    console.error(`[${new Date().toISOString()}] [ERROR] [${ctx}] ${message}`);
    if (trace) {
      console.error(`[${new Date().toISOString()}] [TRACE] ${trace}`);
    }
  }

  warn(message: string, context?: string) {
    const ctx = context || this.context || 'Application';
    console.warn(`[${new Date().toISOString()}] [WARN] [${ctx}] ${message}`);
  }

  debug(message: string, context?: string) {
    const ctx = context || this.context || 'Application';
    console.debug(`[${new Date().toISOString()}] [DEBUG] [${ctx}] ${message}`);
  }

  verbose(message: string, context?: string) {
    const ctx = context || this.context || 'Application';
    console.log(`[${new Date().toISOString()}] [VERBOSE] [${ctx}] ${message}`);
  }
}
