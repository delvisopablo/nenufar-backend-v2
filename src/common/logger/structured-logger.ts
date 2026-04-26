type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type LogPayload = Record<string, unknown>;

function withoutUndefined(payload: LogPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

export class StructuredLogger {
  static log(level: LogLevel, message: string, payload: LogPayload = {}) {
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_LOGS !== 'true') {
      return;
    }

    const line = JSON.stringify(
      withoutUndefined({
        timestamp: new Date().toISOString(),
        level,
        message,
        ...payload,
      }),
    );

    if (level === 'error' || level === 'fatal') {
      console.error(line);
      return;
    }

    if (level === 'warn') {
      console.warn(line);
      return;
    }

    console.log(line);
  }

  static debug(message: string, payload?: LogPayload) {
    this.log('debug', message, payload);
  }

  static info(message: string, payload?: LogPayload) {
    this.log('info', message, payload);
  }

  static warn(message: string, payload?: LogPayload) {
    this.log('warn', message, payload);
  }

  static error(message: string, payload?: LogPayload) {
    this.log('error', message, payload);
  }

  static fatal(message: string, payload?: LogPayload) {
    this.log('fatal', message, payload);
  }
}
