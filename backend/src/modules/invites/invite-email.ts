import { escapeHtml } from '../mail/html.js';
import type { Invite } from './invite.repository.js';

export function inviteEmail(invite: Invite, inviterName: string | null, link: string, validDays: number) {
  const who = inviterName ? `${inviterName} convidou você` : 'Você foi convidado';
  const position = invite.jobRoleName ? `${invite.role}, no cargo ${invite.jobRoleName}` : invite.role;
  const text = [
    'Olá!',
    '',
    `${who} para entrar na ${invite.companyName} no OnboardHub, como ${position}.`,
    'Lá você encontra as trilhas de onboarding preparadas para você e acompanha o seu progresso.',
    '',
    `Para criar sua conta, acesse o link abaixo. Ele vale por ${validDays} dias e só pode ser usado uma vez.`,
    '',
    link,
    '',
    'Se você não esperava este convite, ignore este e-mail.',
  ].join('\n');

  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#0a0a0a;font-size:15px;line-height:1.6;max-width:480px">
<p>Olá!</p>
<p>${escapeHtml(who)} para entrar na <strong>${escapeHtml(invite.companyName)}</strong> no OnboardHub, como ${escapeHtml(position)}.</p>
<p>Lá você encontra as trilhas de onboarding preparadas para você e acompanha o seu progresso.</p>
<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:#5645d4;color:#ffffff;text-decoration:none;font-weight:600">Criar minha conta</a></p>
<p style="color:#5c5c5c;font-size:13px">O link vale por ${validDays} dias e só pode ser usado uma vez. Se você não esperava este convite, ignore este e-mail.</p>
</div>`;

  return { subject: `Você foi convidado para a ${invite.companyName} no OnboardHub`, text, html };
}
