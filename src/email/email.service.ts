import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

type WelcomeEmailVariant = {
  id: 'guardian' | 'playful' | 'elegant' | 'brand-world';
  subject: string;
  preview: string;
  headline: string;
  greetingWithName: string;
  greetingGeneric: string;
  paragraphs: string[];
  ctaLabel: string;
  signoff: string;
  signature: string;
};

const welcomeEmailVariants: readonly WelcomeEmailVariant[] = [
  {
    id: 'guardian',
    subject: 'Bienvenido a Nenúfar 🌿',
    preview: 'Tu cuenta ya está lista para explorar el estanque.',
    headline: 'Tu rincón en el estanque ya está abierto',
    greetingWithName: 'Hola {{name}},',
    greetingGeneric: 'Hola,',
    paragraphs: [
      'Hola!! Soy Pablo, el guardián del estanque, y te doy la bienvenida a Nenúfar.',
      'Ya puedes descubrir negocios, reservar y seguir disfrutando de la experiencia desde tu cuenta.',
      'Cuando quieras, entra y sigue explorando, mi nenúfar es tu nenúfar.',
    ],
    ctaLabel: 'Entrar en Nenúfar',
    signoff: 'Nos vemos por el estanque,',
    signature: 'Pablo, el guardián del estanque',
  },
  {
    id: 'playful',
    subject: 'Tu estanque ya está listo',
    preview: 'Pasa, curiosea y encuentra tu próximo sitio favorito.',
    headline: 'Pasa, que aquí ya cuentas como de casa',
    greetingWithName: 'Ey {{name}},',
    greetingGeneric: 'Ey,',
    paragraphs: [
      'Tu cuenta ya está lista para descubrir negocios con encanto, seguir perfiles y reservar sin complicarte.',
      'Entra cuando quieras, date una vuelta por el estanque y quédate con los rincones que te llamen.',
    ],
    ctaLabel: 'Explorar el estanque',
    signoff: 'Con ganas de verte navegar,',
    signature: 'Pablo, el que os nenúfará a todos',
  },
  {
    id: 'elegant',
    subject: 'Ya formas parte de Nenúfar',
    preview: 'Tu bienvenida ya está hecha y la puerta está abierta.',
    headline: 'La puerta de Nenúfar ya está abierta',
    greetingWithName: 'Qué alegría tenerte aquí, {{name}}.',
    greetingGeneric: 'Qué alegría tenerte aquí.',
    paragraphs: [
      'Desde tu cuenta ya puedes descubrir lugares, reservar planes y seguir a los perfiles que más te inspiren.',
      'Queríamos darte una bienvenida bonita, breve y de verdad: ya estás dentro, y ahora lo interesante es todo lo que puedes encontrar.',
    ],
    ctaLabel: 'Abrir mi cuenta',
    signoff: 'Gracias por entrar en este rincón,',
    signature: 'Pablo del Nenúfar',
  },
  {
    id: 'brand-world',
    subject: 'Pasa, el estanque es tuyo',
    preview: 'Ya estás dentro de Nenúfar: entra y sigue explorando.',
    headline: 'Has caído en el estanque correcto',
    greetingWithName: 'Buenas, {{name}}.',
    greetingGeneric: 'Buenas.',
    paragraphs: [
      'En Nenúfar ya tienes sitio para descubrir negocios, reservar cuando te apetezca y seguir explorando a tu ritmo.',
      'Yo llegué primero para abrir la puerta. Ahora te toca entrar, mirar alrededor y hacer tuyo el paseo.',
    ],
    ctaLabel: 'Seguir explorando',
    signoff: 'Aquí te espero,',
    signature: 'Pablo, el que llegó primero',
  },
] as const;

class WelcomeEmailSendError extends Error {
  constructor() {
    super('No se pudo enviar el email de bienvenida');
    this.name = 'WelcomeEmailSendError';
  }
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resendClient?: Resend;

  isEnabled() {
    return process.env.RESEND_ENABLED?.trim().toLowerCase() === 'true';
  }

  private getClient() {
    if (!this.resendClient) {
      const apiKey = process.env.RESEND_API_KEY?.trim();
      if (!apiKey) {
        throw new Error('RESEND_API_KEY no configurada');
      }

      this.resendClient = new Resend(apiKey);
    }

    return this.resendClient;
  }

  async sendWelcomeEmail(to: string, name?: string): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const from = this.getRequiredEnv('EMAIL_FROM');
    const frontendUrl = this.getRequiredEnv('FRONTEND_URL');
    const variant = this.getRandomWelcomeVariant();
    const safeName = this.normalizeName(name);
    const subject = this.buildWelcomeEmailSubject(variant);
    const html = this.buildWelcomeEmailHtml({
      frontendUrl,
      safeName,
      variant,
    });
    const text = this.buildWelcomeEmailText({
      frontendUrl,
      safeName,
      variant,
    });

    let response: Awaited<ReturnType<Resend['emails']['send']>>;

    try {
      response = await this.getClient().emails.send({
        from,
        to,
        subject,
        html,
        text,
      });
    } catch (error) {
      this.logger.error(
        `Error enviando welcome email a ${to}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new WelcomeEmailSendError();
    }

    if (response.error) {
      this.logger.error(
        `Resend devolvió un error al enviar welcome email a ${to}: ${this.getResendErrorMessage(response.error)}`,
      );
      throw new WelcomeEmailSendError();
    }

    this.logger.log(
      `Welcome email aceptado por Resend para ${to} con variante ${variant.id}`,
    );
  }

  private getRequiredEnv(name: 'EMAIL_FROM' | 'FRONTEND_URL') {
    const value = process.env[name]?.trim();
    if (!value) {
      throw new Error(`${name} no configurado`);
    }

    return value;
  }

  private normalizeName(name?: string) {
    const safeName = name?.trim();
    return safeName || undefined;
  }

  private getRandomWelcomeVariant(): WelcomeEmailVariant {
    const index = Math.floor(Math.random() * welcomeEmailVariants.length);
    return welcomeEmailVariants[index] ?? welcomeEmailVariants[0];
  }

  private buildWelcomeEmailSubject(variant: WelcomeEmailVariant) {
    return variant.subject;
  }

  private buildWelcomeEmailHtml({
    frontendUrl,
    safeName,
    variant,
  }: {
    frontendUrl: string;
    safeName?: string;
    variant: WelcomeEmailVariant;
  }) {
    const greeting = this.buildGreeting(variant, safeName);
    const escapedPreview = this.escapeHtml(variant.preview);
    const escapedHeadline = this.escapeHtml(variant.headline);
    const escapedGreeting = this.escapeHtml(greeting);
    const escapedUrl = this.escapeHtml(frontendUrl);
    const escapedCtaLabel = this.escapeHtml(variant.ctaLabel);
    const escapedSignoff = this.escapeHtml(variant.signoff);
    const escapedSignature = this.escapeHtml(variant.signature);
    const paragraphsHtml = variant.paragraphs
      .map(
        (paragraph) => `
                  <p style="margin:0 0 14px;font-size:16px;line-height:1.7;color:#355345;">
                    ${this.escapeHtml(paragraph)}
                  </p>`,
      )
      .join('');

    return `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${this.escapeHtml(this.buildWelcomeEmailSubject(variant))}</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f0e6;font-family:Arial,Helvetica,sans-serif;color:#1f3028;">
    <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">
      ${escapedPreview}
    </span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f0e6;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fffdf8;border:1px solid #dbe5d8;border-radius:24px;overflow:hidden;">
            <tr>
              <td style="padding:28px 28px 12px;background:#edf4ee;">
                <span style="display:inline-block;padding:7px 12px;border-radius:999px;background:#ffffff;color:#2f6b4f;font-size:12px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">
                  Nenúfar
                </span>
                <h1 style="margin:18px 0 0;font-size:30px;line-height:1.2;color:#1f3028;">
                  ${escapedHeadline}
                </h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 18px;font-size:19px;line-height:1.5;font-weight:600;color:#1f3028;">
                  ${escapedGreeting}
                </p>
                ${paragraphsHtml}
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0 28px;background:#f7faf7;border-radius:16px;">
                  <tr>
                    <td style="padding:16px 18px;">
                      <p style="margin:0 0 8px;font-size:13px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#6a7c70;">
                        Ya puedes empezar
                      </p>
                      <p style="margin:0;font-size:15px;line-height:1.7;color:#355345;">
                        Descubrir negocios, reservar planes y seguir perfiles desde tu cuenta.
                      </p>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 24px;">
                  <a href="${escapedUrl}" style="display:inline-block;padding:14px 24px;background:#2f6b4f;color:#ffffff;text-decoration:none;border-radius:12px;font-size:16px;font-weight:700;">
                    ${escapedCtaLabel}
                  </a>
                </p>
                <p style="margin:0 0 18px;font-size:16px;line-height:1.7;color:#355345;">
                  ${escapedSignoff}<br />
                  <strong style="color:#1f3028;">${escapedSignature}</strong>
                </p>
                <p style="margin:0;font-size:13px;line-height:1.7;color:#6a7c70;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                  <a href="${escapedUrl}" style="color:#2f6b4f;text-decoration:none;">${escapedUrl}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
  }

  private buildWelcomeEmailText({
    frontendUrl,
    safeName,
    variant,
  }: {
    frontendUrl: string;
    safeName?: string;
    variant: WelcomeEmailVariant;
  }) {
    const greeting = this.buildGreeting(variant, safeName);
    const body = variant.paragraphs.join('\n\n');

    return [
      greeting,
      '',
      body,
      '',
      `Ya puedes empezar: descubrir negocios, reservar planes y seguir perfiles desde tu cuenta.`,
      '',
      `${variant.ctaLabel}: ${frontendUrl}`,
      '',
      variant.signoff,
      variant.signature,
    ].join('\n');
  }

  private buildGreeting(variant: WelcomeEmailVariant, safeName?: string) {
    if (!safeName) {
      return variant.greetingGeneric;
    }

    return variant.greetingWithName.replace(
      '{{name}}',
      this.escapeTemplateToken(safeName),
    );
  }

  private escapeTemplateToken(value: string) {
    return value.replace(/{{|}}/g, '').trim();
  }

  private escapeHtml(value: string) {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private getResendErrorMessage(error: unknown) {
    if (
      typeof error === 'object' &&
      error &&
      'message' in error &&
      typeof error.message === 'string'
    ) {
      return error.message;
    }

    return 'Error desconocido de Resend';
  }
}
