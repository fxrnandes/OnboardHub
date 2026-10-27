import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMailer, LogMailer, SmtpMailer } from '../../src/modules/mail/mailer.js';

describe('createMailer', () => {
  afterEach(() => vi.restoreAllMocks());

  it('usa SMTP quando o servidor está configurado', () => {
    const mailer = createMailer({
      SMTP_HOST: 'smtp.exemplo.com',
      SMTP_PORT: '587',
      SMTP_USER: 'usuario',
      SMTP_PASS: 'segredo',
      MAIL_FROM: 'OnboardHub <nao-responda@exemplo.com>',
    });
    expect(mailer).toBeInstanceOf(SmtpMailer);
  });

  it('exige remetente quando o SMTP está configurado', () => {
    expect(() => createMailer({ SMTP_HOST: 'smtp.exemplo.com' })).toThrow(/MAIL_FROM/);
  });

  it('sem SMTP, escreve o e-mail no log para uso em desenvolvimento', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    const mailer = createMailer({});

    expect(mailer).toBeInstanceOf(LogMailer);
    await mailer.send({ to: 'ana@teste.com', subject: 'Assunto', text: 'Corpo com link', html: '<p>Corpo</p>' });
    expect(log).toHaveBeenCalledWith(expect.stringContaining('ana@teste.com'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('Corpo com link'));
  });

  it('envia pelo transporte SMTP', async () => {
    const mailer = createMailer({ SMTP_HOST: 'smtp.exemplo.com', MAIL_FROM: 'OnboardHub <a@b.com>' }) as SmtpMailer;
    const sendMail = vi.fn().mockResolvedValue({});
    mailer.useTransport({ sendMail });

    await mailer.send({ to: 'ana@teste.com', subject: 'Oi', text: 'texto', html: '<p>html</p>' });
    expect(sendMail).toHaveBeenCalledWith({
      from: 'OnboardHub <a@b.com>',
      to: 'ana@teste.com',
      subject: 'Oi',
      text: 'texto',
      html: '<p>html</p>',
    });
  });
});
