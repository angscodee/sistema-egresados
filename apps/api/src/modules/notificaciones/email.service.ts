import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly from: string;
  private readonly enabled: boolean;

  constructor() {
    const host = process.env.SMTP_HOST?.trim();
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim() || process.env.SMTP_PASSWORD?.trim();
    this.from = process.env.MAIL_FROM?.trim() ?? 'Egresados <no-reply@example.com>';
    this.enabled = Boolean(host && user && pass);

    if (this.enabled) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      });
      this.logger.log(`Email service enabled — SMTP: ${host}:${port}`);
    } else {
      this.transporter = null;
      this.logger.warn('Email service disabled — SMTP_HOST, SMTP_USER or SMTP_PASS not configured.');
    }
  }

  /** Sends an email. Never throws — logs the error and returns false on failure. */
  async sendSafe(opts: SendMailOptions): Promise<boolean> {
    if (!this.enabled || !this.transporter) {
      this.logger.debug(`[email skipped] to=${opts.to} subject="${opts.subject}"`);
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.from,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      this.logger.log(`Email sent to ${opts.to}: "${opts.subject}"`);
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${opts.to}: ${String(err)}`);
      return false;
    }
  }

  async sendPostulacionConfirmacion(opts: {
    to: string;
    egresadoNombre: string;
    ofertaTitulo: string;
    empresaNombre: string;
  }): Promise<void> {
    await this.sendSafe({
      to: opts.to,
      subject: `Postulación recibida: ${opts.ofertaTitulo}`,
      html: `<h2>¡Hola, ${opts.egresadoNombre}!</h2>
<p>Tu postulación a <strong>${opts.ofertaTitulo}</strong> en <strong>${opts.empresaNombre}</strong> fue recibida correctamente.</p>
<p>Te notificaremos cuando haya novedades sobre tu candidatura.</p>
<hr/><p style="color:#888;font-size:12px;">Sistema de Gestión de Egresados</p>`,
      text: `Hola ${opts.egresadoNombre}, tu postulación a "${opts.ofertaTitulo}" en ${opts.empresaNombre} fue recibida.`,
    });
  }

  async sendCambioEstadoPostulacion(opts: {
    to: string;
    egresadoNombre: string;
    ofertaTitulo: string;
    estadoLabel: string;
    motivo?: string | null;
  }): Promise<void> {
    const motivoHtml = opts.motivo ? `<p><strong>Motivo:</strong> ${opts.motivo}</p>` : '';
    await this.sendSafe({
      to: opts.to,
      subject: `Actualización de postulación: ${opts.ofertaTitulo}`,
      html: `<h2>¡Hola, ${opts.egresadoNombre}!</h2>
<p>El estado de tu postulación a <strong>${opts.ofertaTitulo}</strong> cambió a: <strong>${opts.estadoLabel}</strong>.</p>
${motivoHtml}
<p>Ingresa a la plataforma para ver más detalles.</p>
<hr/><p style="color:#888;font-size:12px;">Sistema de Gestión de Egresados</p>`,
      text: `Hola ${opts.egresadoNombre}, tu postulación a "${opts.ofertaTitulo}" cambió a: ${opts.estadoLabel}.`,
    });
  }
}
