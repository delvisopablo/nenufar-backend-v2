/// <reference types="jest" />

import { Logger } from '@nestjs/common';
import {
  AuthEmailWebhookSendError,
  AuthEmailWebhookService,
} from './auth-email-webhook.service';

describe('AuthEmailWebhookService', () => {
  const originalEnv = { ...process.env };
  const originalFetch = global.fetch;
  let service: AuthEmailWebhookService;
  let fetchMock: jest.Mock;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let loggerDebugSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 202,
    });
    global.fetch = fetchMock as typeof fetch;
    process.env = {
      ...originalEnv,
      N8N_AUTH_EMAIL_WEBHOOK_URL: 'https://n8n.example.test/webhook/auth-email',
      N8N_AUTH_EMAIL_WEBHOOK_SECRET: 'test-secret',
      APP_NAME: 'Nenúfar',
      FRONTEND_LOGIN_URL: 'https://app.nenufar.test/login',
      SUPPORT_EMAIL: 'soporte@nenufar.test',
    };
    service = new AuthEmailWebhookService();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
    loggerDebugSpy = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerLogSpy.mockRestore();
    loggerDebugSpy.mockRestore();
    process.env = { ...originalEnv };
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('construye el payload de bienvenida para n8n', () => {
    expect(
      service.buildWelcomePayload({
        email: 'ada@example.com',
        name: ' Ada ',
      }),
    ).toEqual({
      eventType: 'welcome',
      email: 'ada@example.com',
      name: 'Ada',
      appName: 'Nenúfar',
      loginUrl: 'https://app.nenufar.test/login',
      supportEmail: 'soporte@nenufar.test',
    });
  });

  it('construye el payload de código de confirmación para n8n', () => {
    expect(
      service.buildConfirmationCodePayload({
        email: 'ada@example.com',
        name: 'Ada',
        confirmationCode: '123456',
      }),
    ).toEqual({
      eventType: 'confirmation_code',
      email: 'ada@example.com',
      name: 'Ada',
      appName: 'Nenúfar',
      confirmationCode: '123456',
      supportEmail: 'soporte@nenufar.test',
    });
  });

  it('envía JSON al webhook sin cabeceras de autenticación en modo depuración', async () => {
    await service.sendWelcomeEmail('ada@example.com', 'Ada');

    expect(fetchMock).toHaveBeenCalledWith(
      'https://n8n.example.test/webhook/auth-email',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventType: 'welcome',
          email: 'ada@example.com',
          name: 'Ada',
          appName: 'Nenúfar',
          loginUrl: 'https://app.nenufar.test/login',
          supportEmail: 'soporte@nenufar.test',
        }),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('loguea el body de n8n cuando la respuesta no es correcta', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: jest.fn().mockResolvedValue('webhook not found'),
    });

    await expect(
      service.sendWelcomeEmail('ada@example.com', 'Ada'),
    ).resolves.toBe(false);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        '[n8n] webhook respondió status=404 statusText=Not Found body=webhook not found',
      ),
    );
  });

  it('si n8n falla, devuelve false en modo no obligatorio y no expone el código en logs', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    await expect(
      service.sendConfirmationCode(
        'ada@example.com',
        'Ada',
        '123456',
      ),
    ).resolves.toBe(false);

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining('eventType=confirmation_code'),
      expect.any(String),
    );
    expect(loggerErrorSpy.mock.calls.flat().join(' ')).not.toContain('123456');
  });

  it('si el envío es obligatorio, convierte el fallo en error controlado', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      service.sendConfirmationCode('ada@example.com', 'Ada', '123456', {
        required: true,
      }),
    ).rejects.toBeInstanceOf(AuthEmailWebhookSendError);
  });
});
