import { Injectable, Logger } from '@nestjs/common';

type AuthEmailEventType = 'welcome' | 'confirmation_code' | 'business_welcome';

export type WelcomeAuthEmailPayload = {
  eventType: 'welcome';
  email: string;
  name: string;
  appName: string;
  loginUrl: string;
  supportEmail?: string;
};

export type BusinessWelcomeAuthEmailPayload = {
  eventType: 'business_welcome';
  email: string;
  name: string;
  businessName: string;
  appName: string;
  loginUrl: string;
  supportEmail?: string;
};

export type ConfirmationCodeAuthEmailPayload = {
  eventType: 'confirmation_code';
  email: string;
  name: string;
  appName: string;
  confirmationCode: string;
  supportEmail?: string;
};

type AuthEmailPayload =
  | WelcomeAuthEmailPayload
  | BusinessWelcomeAuthEmailPayload
  | ConfirmationCodeAuthEmailPayload;

type SendOptions = {
  required?: boolean;
};

const DEFAULT_WEBHOOK_TIMEOUT_MS = 5000;

export class AuthEmailWebhookSendError extends Error {
  constructor(eventType: AuthEmailEventType) {
    super(`No se pudo notificar el email de autenticación: ${eventType}`);
    this.name = 'AuthEmailWebhookSendError';
  }
}

@Injectable()
export class AuthEmailWebhookService {
  private readonly logger = new Logger(AuthEmailWebhookService.name);

  isEnabled() {
    return Boolean(this.getWebhookUrl());
  }

  buildWelcomePayload(input: {
    email: string;
    name?: string | null;
  }): WelcomeAuthEmailPayload {
    return {
      eventType: 'welcome',
      email: input.email,
      name: this.normalizeName(input.name),
      appName: this.getAppName(),
      loginUrl: this.getLoginUrl(),
      ...this.getSupportEmailPayload(),
    };
  }

  buildConfirmationCodePayload(input: {
    email: string;
    name?: string | null;
    confirmationCode: string;
  }): ConfirmationCodeAuthEmailPayload {
    return {
      eventType: 'confirmation_code',
      email: input.email,
      name: this.normalizeName(input.name),
      appName: this.getAppName(),
      confirmationCode: input.confirmationCode,
      ...this.getSupportEmailPayload(),
    };
  }

  buildBusinessWelcomePayload(input: {
    email: string;
    name?: string | null;
    businessName?: string | null;
  }): BusinessWelcomeAuthEmailPayload {
    const name = this.normalizeName(input.name);

    return {
      eventType: 'business_welcome',
      email: input.email,
      name,
      businessName: this.normalizeBusinessName(input.businessName, name),
      appName: this.getAppName(),
      loginUrl: this.getLoginUrl(),
      ...this.getSupportEmailPayload(),
    };
  }

  async sendWelcomeEmail(
    email: string,
    name?: string | null,
    options: SendOptions = {},
  ) {
    return this.postAuthEmailEvent(
      this.buildWelcomePayload({ email, name }),
      options,
    );
  }

  async sendBusinessWelcomeEmail(
    email: string,
    name?: string | null,
    businessName?: string | null,
    options: SendOptions = {},
  ) {
    return this.postAuthEmailEvent(
      this.buildBusinessWelcomePayload({ email, name, businessName }),
      options,
    );
  }

  async sendConfirmationCode(
    email: string,
    name: string | null | undefined,
    confirmationCode: string,
    options: SendOptions = {},
  ) {
    return this.postAuthEmailEvent(
      this.buildConfirmationCodePayload({
        email,
        name,
        confirmationCode,
      }),
      options,
    );
  }

  private async postAuthEmailEvent(
    payload: AuthEmailPayload,
    options: SendOptions,
  ) {
    const webhookUrl = this.getWebhookUrl();

    if (!webhookUrl) {
      return false;
    }

    try {
      this.logger.debug(
        `[n8n] POST url=${webhookUrl} eventType=${payload.eventType} email=${this.maskEmail(payload.email)}`,
      );

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: this.buildHeaders(),
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(DEFAULT_WEBHOOK_TIMEOUT_MS),
      });

      if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        this.logger.error(
          `[n8n] webhook respondió status=${response.status} statusText=${response.statusText} body=${responseText.slice(0, 500)}`,
        );
        throw new Error(`n8n webhook respondió con estado ${response.status}`);
      }

      this.logger.log(
        `Webhook n8n auth email aceptado eventType=${payload.eventType} email=${this.maskEmail(payload.email)}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Fallo notificando webhook n8n auth email eventType=${payload.eventType} email=${this.maskEmail(payload.email)}. ${
          options.required
            ? 'El flujo requiere este envío.'
            : 'El flujo continúa.'
        }`,
        error instanceof Error ? error.stack : undefined,
      );

      if (options.required) {
        throw new AuthEmailWebhookSendError(payload.eventType);
      }

      return false;
    }
  }

  private buildHeaders() {
    return {
      'Content-Type': 'application/json',
    };
  }

  private getWebhookUrl() {
    return process.env.N8N_AUTH_EMAIL_WEBHOOK_URL?.trim() || undefined;
  }

  private getAppName() {
    return process.env.APP_NAME?.trim() || 'Nenúfar';
  }

  private getLoginUrl() {
    return (
      process.env.FRONTEND_LOGIN_URL?.trim() ||
      process.env.FRONTEND_URL?.trim() ||
      'https://minenufar.com/login'
    );
  }

  private getSupportEmailPayload() {
    const supportEmail =
      process.env.SUPPORT_EMAIL?.trim() ||
      process.env.AUTH_SUPPORT_EMAIL?.trim() ||
      'libeluladelnenufar@gmail.com';

    return { supportEmail };
  }

  private normalizeName(name?: string | null) {
    return name?.trim() || '';
  }

  private normalizeBusinessName(
    businessName?: string | null,
    fallbackName?: string,
  ) {
    return businessName?.trim() || fallbackName?.trim() || 'Tu negocio';
  }

  private maskEmail(email: string) {
    const [localPart, domain] = email.split('@');

    if (!localPart || !domain) {
      return '[email-redacted]';
    }

    return `${localPart.slice(0, 2)}***@${domain}`;
  }
}
