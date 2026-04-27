type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

type LogPayload = Record<string, unknown>;

const levelLabels: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO ',
  warn: 'WARN ',
  error: 'ERROR',
  fatal: 'FATAL',
};

const levelColors: Record<LogLevel, string> = {
  debug: '\x1b[90m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  fatal: '\x1b[35m',
};

const colorReset = '\x1b[0m';
const colorDim = '\x1b[2m';

function withoutUndefined(payload: LogPayload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined),
  );
}

function shouldPrettyPrint() {
  const format = process.env.LOG_FORMAT?.trim().toLowerCase();

  if (format === 'json') {
    return false;
  }

  if (format === 'pretty') {
    return true;
  }

  return process.env.NODE_ENV !== 'production';
}

function supportsColor() {
  if (process.env.NO_COLOR || process.env.FORCE_COLOR === '0') {
    return false;
  }

  if (process.env.FORCE_COLOR) {
    return true;
  }

  return Boolean(process.stdout.isTTY);
}

function colorize(text: string, color: string) {
  return supportsColor() ? `${color}${text}${colorReset}` : text;
}

function formatTimestamp(date: Date) {
  return date.toISOString().replace('T', ' ');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function prettifyMessage(message: string) {
  switch (message) {
    case 'http_request':
      return 'HTTP request';
    case 'prisma_warn':
      return 'Prisma warning';
    case 'prisma_error':
      return 'Prisma error';
    case 'prisma_query':
      return 'Prisma query';
    case 'uncaught_exception':
      return 'Uncaught exception';
    case 'unhandled_rejection':
      return 'Unhandled rejection';
    default:
      return message;
  }
}

function stringifyValue(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }

  if (value instanceof Error) {
    return JSON.stringify(
      {
        name: value.name,
        message: value.message,
        stack: value.stack,
      },
      null,
      2,
    );
  }

  return JSON.stringify(value, null, 2);
}

function indentBlock(block: string, indent = '    ') {
  return block
    .split('\n')
    .map((line) => `${indent}${line}`)
    .join('\n');
}

function buildSummary(payload: LogPayload) {
  const parts: string[] = [];

  if (typeof payload.method === 'string' && typeof payload.path === 'string') {
    parts.push(`${payload.method} ${payload.path}`);
  }

  if (typeof payload.statusCode === 'number') {
    parts.push(`-> ${payload.statusCode}`);
  }

  if (typeof payload.durationMs === 'number') {
    parts.push(`(${payload.durationMs} ms)`);
  }

  if (typeof payload.errorCode === 'string') {
    parts.push(`[${payload.errorCode}]`);
  }

  if (payload.slow === true) {
    parts.push('[slow]');
  }

  if (typeof payload.requestId === 'string') {
    parts.push(`req=${payload.requestId}`);
  }

  if (typeof payload.target === 'string') {
    parts.push(`target=${payload.target}`);
  }

  return parts.join(' ');
}

function compactPayload(message: string, payload: LogPayload) {
  const compact = { ...payload };

  delete compact.method;
  delete compact.path;
  delete compact.statusCode;
  delete compact.durationMs;
  delete compact.requestId;
  delete compact.target;
  delete compact.slow;
  delete compact.errorCode;

  if (compact.message === message) {
    delete compact.message;
  }

  return withoutUndefined(compact);
}

function formatPrettyLine(level: LogLevel, message: string, payload: LogPayload) {
  const timestamp = colorize(formatTimestamp(new Date()), colorDim);
  const label = colorize(levelLabels[level], levelColors[level]);
  const readableMessage = prettifyMessage(message);
  const summary = buildSummary(payload);
  const details = compactPayload(message, payload);
  const lines = [`${timestamp} ${label} ${readableMessage}${summary ? ` ${summary}` : ''}`];

  for (const [key, value] of Object.entries(details)) {
    if (value === undefined) {
      continue;
    }

    const printable = stringifyValue(value);

    if (isPlainObject(value) || Array.isArray(value) || printable.includes('\n')) {
      lines.push(`  ${key}:`);
      lines.push(indentBlock(printable));
      continue;
    }

    lines.push(`  ${key}: ${printable}`);
  }

  return lines.join('\n');
}

export class StructuredLogger {
  static log(level: LogLevel, message: string, payload: LogPayload = {}) {
    if (process.env.NODE_ENV === 'test' && process.env.ENABLE_TEST_LOGS !== 'true') {
      return;
    }

    const normalizedPayload = withoutUndefined(payload);
    const line = shouldPrettyPrint()
      ? formatPrettyLine(level, message, normalizedPayload)
      : JSON.stringify(
          withoutUndefined({
            timestamp: new Date().toISOString(),
            level,
            message,
            ...normalizedPayload,
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
