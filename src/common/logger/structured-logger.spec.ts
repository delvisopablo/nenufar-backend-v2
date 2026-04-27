import { StructuredLogger } from './structured-logger';

describe('StructuredLogger', () => {
  const originalEnv = { ...process.env };
  const originalStdoutIsTTY = process.stdout.isTTY;

  beforeEach(() => {
    jest.restoreAllMocks();
    process.env = { ...originalEnv };
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: false,
    });
  });

  afterAll(() => {
    process.env = originalEnv;
    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: originalStdoutIsTTY,
    });
  });

  it('prints a human-readable format in development', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.LOG_FORMAT;
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    StructuredLogger.info('http_request', {
      method: 'GET',
      path: '/health',
      statusCode: 200,
      durationMs: 18,
      requestId: 'req-123',
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0] as string;
    expect(output).toContain('INFO');
    expect(output).toContain('HTTP request GET /health -> 200 (18 ms) req=req-123');
  });

  it('keeps json format in production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.LOG_FORMAT;
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    StructuredLogger.info('http_request', {
      method: 'GET',
      path: '/health',
      statusCode: 200,
    });

    expect(spy).toHaveBeenCalledTimes(1);
    const output = spy.mock.calls[0][0] as string;
    const parsed = JSON.parse(output) as Record<string, unknown>;

    expect(parsed.level).toBe('info');
    expect(parsed.message).toBe('http_request');
    expect(parsed.method).toBe('GET');
    expect(parsed.path).toBe('/health');
    expect(parsed.statusCode).toBe(200);
  });

  it('does not log in tests unless explicitly enabled', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.ENABLE_TEST_LOGS;
    const spy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    StructuredLogger.info('http_request', {
      method: 'GET',
      path: '/health',
    });

    expect(spy).not.toHaveBeenCalled();
  });
});
