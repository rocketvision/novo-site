import "server-only";
import { STUDIO_NAME } from "@/lib/cms/brand";
import { cmsOrigin, env } from "@/server/env";
import type { Mail } from "@/server/mail";

/**
 * E-mails transacionais do Content Studio: HTML com a marca (tabelas e estilos inline, que é o que
 * os clientes de e-mail entendem) e versão em texto puro com o mesmo conteúdo.
 */

export type Template = {
  to: string;
  subject: string;
  /** Texto curto que aparece ao lado do assunto na caixa de entrada. */
  preheader: string;
  eyebrow: string;
  title: string;
  greeting: string;
  paragraphs: string[];
  /** Destaques em lista (ex.: dados de uma indicação), antes do botão. */
  details?: { label: string; value: string }[];
  action?: { label: string; url: string };
  note: string[];
  /** Produto no cabeçalho e no rodapé. Padrão: Content Studio. */
  /** Produto que assina o e-mail. `brand` troca o símbolo e o nome do cabeçalho (ex.: Rocket Alliance). */
  product?: { label: string; footer: string; brand?: { mark: string; name: [string, string] } };
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "ui-monospace,SFMono-Regular,Menlo,Consolas,monospace";

function escape(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function render(t: Template): Mail {
  const siteOrigin = new URL(env.NEXT_PUBLIC_SITE_URL).origin;
  const siteHost = new URL(siteOrigin).host;
  const url = t.action ? escape(t.action.url) : "";
  const product = t.product ?? { label: "Content Studio", footer: `E-mail automático do ${STUDIO_NAME}` };
  const logo = `${cmsOrigin}/brand/${product.brand?.mark ?? "rocket-vision-mark.png"}`;
  const [nameStrong, nameLight] = product.brand?.name ?? ["Rocket", "Vision"];
  const details = (t.details ?? [])
    .map(
      (d) =>
        `<tr><td style="padding:10px 0;border-top:1px solid #efeff4;font:400 13px/1.5 ${FONT};color:#86868b;width:38%;vertical-align:top;">${escape(d.label)}</td><td style="padding:10px 0;border-top:1px solid #efeff4;font:500 14px/1.5 ${FONT};color:#1d1d1f;vertical-align:top;">${escape(d.value)}</td></tr>`,
    )
    .join("");
  const actionHtml = t.action
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 32px;"><tr>
<td style="border-radius:10px;background:#0a0a0b;">
<a href="${url}" target="_blank" style="display:inline-block;padding:14px 26px;font:600 15px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:10px;">${escape(t.action.label)}&nbsp;&nbsp;<span style="color:#a1a1a6;">&rarr;</span></a>
</td>
</tr></table>`
    : `<div style="height:12px;"></div>`;
  const fallbackLink = t.action
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
<tr><td style="border-top:1px solid #efeff4;padding-top:20px;">
<p style="margin:0 0 6px;font:400 12px/1.5 ${FONT};color:#86868b;">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
<p style="margin:0;font:400 12px/1.5 ${MONO};color:#3a3a3c;word-break:break-all;"><a href="${url}" target="_blank" style="color:#3a3a3c;text-decoration:underline;">${url}</a></p>
</td></tr>
</table>`
    : "";

  const paragraphs = t.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font:400 15px/1.65 ${FONT};color:#3a3a3c;">${escape(p)}</p>`)
    .join("");
  const note = t.note.map((n) => `<p style="margin:0 0 6px;font:400 13px/1.6 ${FONT};color:#6e6e73;">${escape(n)}</p>`).join("");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escape(t.subject)}</title>
<style>@media (max-width:480px){.rv-pad{padding:32px 24px 28px !important}.rv-title{font-size:23px !important}}</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escape(t.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f5f7;">
<tr><td align="center" style="padding:40px 16px 48px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

<tr><td style="padding:0 4px 24px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="vertical-align:middle;"><img src="${logo}" width="36" height="36" alt="${escape(`${nameStrong} ${nameLight}`)}" style="display:block;border:0;border-radius:9px;"></td>
<td style="vertical-align:middle;padding-left:12px;">
<div style="font:600 17px/1 ${FONT};letter-spacing:-0.02em;color:#0a0a0b;">${escape(nameStrong)} <span style="font-weight:400;color:#6e6e73;">${escape(nameLight)}</span></div>
<div style="font:300 9.5px/1 ${FONT};letter-spacing:0.42em;text-transform:uppercase;color:#6e6e73;padding-top:7px;">${escape(product.label)}</div>
</td>
</tr></table>
</td></tr>

<tr><td style="background:#ffffff;border:1px solid #e8e8ed;border-radius:16px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td class="rv-pad" style="padding:40px 40px 36px;">
<p style="margin:0 0 12px;font:600 11px/1 ${FONT};letter-spacing:0.16em;text-transform:uppercase;color:#86868b;">${escape(t.eyebrow)}</p>
<h1 class="rv-title" style="margin:0 0 24px;font:600 26px/1.2 ${FONT};letter-spacing:-0.02em;color:#0a0a0b;">${escape(t.title)}</h1>
<p style="margin:0 0 16px;font:400 15px/1.65 ${FONT};color:#3a3a3c;">${escape(t.greeting)}</p>
${paragraphs}
${details ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">${details}</table>` : ""}
${actionHtml}
${note}
${fallbackLink}
</td></tr>
</table>
</td></tr>

<tr><td style="padding:24px 4px 0;">
<p style="margin:0 0 4px;font:400 12px/1.6 ${FONT};color:#86868b;">${escape(product.footer)}, enviado para ${escape(t.to)}. Não é preciso responder.</p>
<p style="margin:0;font:400 12px/1.6 ${FONT};color:#86868b;"><a href="${siteOrigin}" target="_blank" style="color:#86868b;text-decoration:underline;">${escape(siteHost)}</a></p>
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    t.greeting,
    "",
    ...t.paragraphs.flatMap((p) => [p, ""]),
    ...(t.details?.length ? [...t.details.map((d) => `${d.label}: ${d.value}`), ""] : []),
    ...(t.action ? [`${t.action.label}: ${t.action.url}`, ""] : []),
    ...t.note,
    "",
    t.product ? t.product.label : `${STUDIO_NAME}`,
    siteOrigin,
  ].join("\n");

  return { to: t.to, subject: t.subject, html, text };
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

export function inviteMail(user: { email: string; name: string }, link: string, invitedBy: string) {
  return render({
    to: user.email,
    subject: `Seu convite para o ${STUDIO_NAME}`,
    preheader: `${invitedBy} convidou você para editar o site da Rocket Vision.`,
    eyebrow: "Convite",
    title: "Você foi convidado para o Content Studio",
    greeting: `Olá, ${firstName(user.name)}.`,
    paragraphs: [
      `${invitedBy} convidou você para o ${STUDIO_NAME}, onde o conteúdo do site da Rocket Vision é editado e publicado.`,
      "Para entrar, crie a sua senha pelo botão abaixo.",
    ],
    action: { label: "Criar minha senha", url: link },
    note: ["O link vale por 7 dias e só pode ser usado uma vez."],
  });
}

export function adminResetMail(user: { email: string; name: string }, link: string, actorName: string) {
  return render({
    to: user.email,
    subject: `Crie uma nova senha no ${STUDIO_NAME}`,
    preheader: `${actorName} gerou um link para você criar uma nova senha.`,
    eyebrow: "Acesso",
    title: "Crie uma nova senha",
    greeting: `Olá, ${firstName(user.name)}.`,
    paragraphs: [`${actorName} gerou um link para você criar uma nova senha no ${STUDIO_NAME}.`],
    action: { label: "Criar nova senha", url: link },
    note: ["O link vale por 1 hora e só pode ser usado uma vez."],
  });
}

export function selfResetMail(user: { email: string; name: string }, link: string) {
  return render({
    to: user.email,
    subject: `Redefinição de senha do ${STUDIO_NAME}`,
    preheader: "Recebemos um pedido para redefinir a sua senha.",
    eyebrow: "Segurança",
    title: "Redefina a sua senha",
    greeting: `Olá, ${firstName(user.name)}.`,
    paragraphs: [`Recebemos um pedido para redefinir a senha da sua conta no ${STUDIO_NAME}.`],
    action: { label: "Redefinir senha", url: link },
    note: [
      "O link vale por 1 hora e só pode ser usado uma vez.",
      "Se você não fez esse pedido, pode ignorar este e-mail: a sua senha atual continua valendo.",
    ],
  });
}
