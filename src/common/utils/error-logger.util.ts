import { LoggerService } from '../logger/logger.service';

export function logError(
  logger: LoggerService,
  context: string,
  error: unknown,
) {
  if (error instanceof Error) {
    logger.error(`${context}: ${error.message}`, error.stack);
  } else {
    logger.error(`${context}: ${JSON.stringify(error)}`);
  }
}
