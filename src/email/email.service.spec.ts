/// <reference types="jest" />

import { Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { EmailService } from './email.service';

const mockSend = jest.fn();

jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: mockSend,
    },
  })),
}));

describe('EmailService', () => {
  const originalEnv = { ...process.env };
  let service: EmailService;
  let loggerErrorSpy: jest.SpyInstance;
  let loggerLogSpy: jest.SpyInstance;
  let resendConstructor: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    resendConstructor = Resend as unknown as jest.Mock;
    process.env = {
      ...originalEnv,
      RESEND_ENABLED: 'true',
      RESEND_API_KEY: 're_test_123',
      EMAIL_FROM: 'Nenúfar <hola@nenufar.test>',
      FRONTEND_URL: 'https://app.nenufar.test',
    };
    service = new EmailService();
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    loggerLogSpy = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    loggerErrorSpy.mockRestore();
    loggerLogSpy.mockRestore();
    process.env = { ...originalEnv };
  });

  it('sale silenciosamente cuando RESEND_ENABLED está en false', async () => {
    process.env.RESEND_ENABLED = 'false';

    await service.sendWelcomeEmail('ada@example.com', 'Ada');

    expect(resendConstructor).not.toHaveBeenCalled();
  });

  it('envía el welcome email con saludo personalizado y la variante del guardián', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_123' }, error: null });
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0);

    await service.sendWelcomeEmail('ada@example.com', 'Ada');

    expect(resendConstructor).toHaveBeenCalledWith('re_test_123');
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'Nenúfar <hola@nenufar.test>',
        to: 'ada@example.com',
        subject: 'Bienvenido a Nenúfar 🌿',
        html: expect.stringContaining('Hola Ada,'),
        text: expect.stringContaining(
          'Pablo, el guardián del estanque',
        ),
      }),
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.stringContaining(
          'mi nenúfar es tu nenúfar',
        ),
      }),
    );
    expect(loggerLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('variante guardian'),
    );

    randomSpy.mockRestore();
  });

  it('usa saludo genérico cuando el usuario no tiene nombre', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_456' }, error: null });
    const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.3);

    await service.sendWelcomeEmail('ada@example.com');

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: 'Tu estanque ya está listo',
        html: expect.stringContaining('Ey,'),
        text: expect.stringContaining('Ey,'),
      }),
    );
    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        html: expect.not.stringContaining('undefined'),
      }),
    );

    randomSpy.mockRestore();
  });

  it('tiene cuatro variantes internas de welcome email', async () => {
    mockSend.mockResolvedValue({ data: { id: 'email_789' }, error: null });
    const randomValues = [0, 0.26, 0.51, 0.76];
    const subjects = new Set<string>();

    for (const value of randomValues) {
      const randomSpy = jest.spyOn(Math, 'random').mockReturnValue(value);

      await service.sendWelcomeEmail('ada@example.com', 'Ada');

      const lastCall =
        mockSend.mock.calls[mockSend.mock.calls.length - 1]?.[0] ?? {};
      subjects.add(lastCall.subject as string);
      randomSpy.mockRestore();
    }

    expect(subjects).toEqual(
      new Set([
        'Bienvenido a Nenúfar 🌿',
        'Tu estanque ya está listo',
        'Ya formas parte de Nenúfar',
        'Pasa, el estanque es tuyo',
      ]),
    );
  });

  it('lanza un error controlado si Resend responde con error', async () => {
    mockSend.mockResolvedValue({
      data: null,
      error: { message: 'domain not verified' },
    });

    await expect(
      service.sendWelcomeEmail('ada@example.com', 'Ada'),
    ).rejects.toThrow('No se pudo enviar el email de bienvenida');

    expect(loggerErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Resend devolvió un error al enviar welcome email a ada@example.com: domain not verified',
      ),
    );
  });
});
