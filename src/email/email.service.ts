import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

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

  async sendWelcomeEmail(
    to: string,
    name?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _p0?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _nombre?: string,
  ): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    const from = process.env.EMAIL_FROM?.trim();
    const frontendUrl = process.env.FRONTEND_URL?.trim();

    if (!from) {
      throw new Error('EMAIL_FROM no configurado');
    }

    if (!frontendUrl) {
      throw new Error('FRONTEND_URL no configurado');
    }

    const safeName = name?.trim();
    const greeting = safeName ? `Hola ${safeName},` : 'Hola,';
    const html = `
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bienvenido a Nenúfar</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7f4;font-family:Arial,Helvetica,sans-serif;color:#183126;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="padding:32px 28px 20px;background:#183126;color:#ffffff;font-size:28px;font-weight:700;">
                Nenúfar
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <p style="margin:0 0 16px;font-size:20px;line-height:1.4;font-weight:600;">${greeting}</p>
                <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#345244;">
                  Hola!! Soy Pablo, el que guardián del estanque y te doy la bienvenida a Nenúfar. Ya puedes descubrir negocios, reservar y seguir disfrutando de la experiencia desde tu cuenta.
                </p>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:#345244;">
                  Cuando quieras, entra y sigue explorando, mi nenúfar es tu nenúfar.
                </p>
                <p style="margin:0 0 28px;">
                  <a href="${frontendUrl}" style="display:inline-block;padding:14px 22px;background:#2e6b4f;color:#ffffff;text-decoration:none;border-radius:10px;font-size:16px;font-weight:600;">
                    Ir a Nenúfar
                  </a>
                </p>
                <p style="margin:0;font-size:14px;line-height:1.6;color:#6b7f73;">
                  Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
                  <a href="${frontendUrl}" style="color:#2e6b4f;text-decoration:none;">${frontendUrl}</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const response = await this.getClient().emails.send({
      from,
      to,
      subject: 'Bienvenido a Nenúfar',
      html,
    });

    if (response.error) {
      this.logger.error(
        `Resend devolvió un error al enviar welcome email a ${to}: ${JSON.stringify(response.error)}`,
      );
      throw new Error('No se pudo enviar el email de bienvenida');
    }
  }
}
