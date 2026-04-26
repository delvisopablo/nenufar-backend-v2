import { StructuredLogger } from '../logger/structured-logger';

let registered = false;

function serializeReason(reason: unknown) {
  if (reason instanceof Error) {
    return {
      name: reason.name,
      message: reason.message,
      stack: process.env.NODE_ENV !== 'production' ? reason.stack : undefined,
    };
  }

  return { reason };
}

function exitInProduction() {
  if (process.env.NODE_ENV === 'production') {
    setImmediate(() => process.exit(1));
  }
}

export function registerProcessErrorHandlers() {
  if (registered) {
    return;
  }
  registered = true;

  process.on('uncaughtException', (error) => {
    StructuredLogger.fatal('uncaught_exception', serializeReason(error));
    exitInProduction();
  });

  process.on('unhandledRejection', (reason) => {
    StructuredLogger.fatal('unhandled_rejection', serializeReason(reason));
    exitInProduction();
  });
}
