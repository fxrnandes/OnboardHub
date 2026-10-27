import nodemailer from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

interface Transport {
  sendMail(options: MailMessage & { from: string }): Promise<unknown>;
}

export class LogMailer implements Mailer {
  async send({ to, subject, text }: MailMessage): Promise<void> {
    console.info(`[e-mail] Para: ${to}\nAssunto: ${subject}\n\n${text}`);
  }
}

export class SmtpMailer implements Mailer {
  private transport: Transport;

  constructor(
    options: { host: string; port: number; user?: string; pass?: string },
    private readonly from: string,
  ) {
    this.transport = nodemailer.createTransport({
      host: options.host,
      port: options.port,
      secure: options.port === 465,
      auth: options.user ? { user: options.user, pass: options.pass } : undefined,
    });
  }

  useTransport(transport: Transport): void {
    this.transport = transport;
  }

  async send(message: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, ...message });
  }
}

export function createMailer(env: NodeJS.ProcessEnv = process.env): Mailer {
  if (!env.SMTP_HOST) return new LogMailer();
  if (!env.MAIL_FROM) throw new Error('Variável de ambiente obrigatória não definida: MAIL_FROM');
  return new SmtpMailer(
    { host: env.SMTP_HOST, port: Number(env.SMTP_PORT ?? 587), user: env.SMTP_USER, pass: env.SMTP_PASS },
    env.MAIL_FROM,
  );
}
