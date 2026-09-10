import {
  BRAND_TAGLINE,
  EMAIL_COLORS,
  FONT_BODY,
  FONT_HEADING,
  escapeHtml,
} from "@/lib/email/brand";
import { siteUrl } from "@/lib/actions/site-url.server";

/** Table-based, inline-styled, no CSS Grid/JS/hover-dependent content, no
 * external fonts — the constraints real email clients (Gmail, Outlook,
 * Apple Mail) actually require. Every component below returns a plain
 * HTML string; nothing here ever renders in a browser. */

export function emailHeader(): string {
  // Read inside the function, not hoisted to module scope — env.SITE_URL
  // is cached by env.server.ts on first read, so a module-level constant
  // here would permanently freeze whatever SITE_URL resolved to at this
  // module's first import, instead of the real configured domain.
  const logoUrl = siteUrl("/icon-512.png");
  return `
<tr>
  <td style="padding:32px 40px 20px 40px; text-align:center;" align="center">
    <img src="${escapeHtml(logoUrl)}" width="44" height="44" alt="Solventia" style="display:block; margin:0 auto 10px auto; border:0;" />
    <div style="font-family:${FONT_HEADING}; font-size:19px; font-weight:700; letter-spacing:0.14em; color:${EMAIL_COLORS.navy};">SOLVENTIA</div>
    <div style="margin-top:6px; font-family:${FONT_BODY}; font-size:10px; font-weight:bold; letter-spacing:0.22em; color:${EMAIL_COLORS.champagne};">${escapeHtml(BRAND_TAGLINE)}</div>
    <div style="margin:20px auto 0 auto; width:40px; height:2px; background-color:${EMAIL_COLORS.champagne}; font-size:0; line-height:0;">&nbsp;</div>
  </td>
</tr>`;
}

export function emailFooter(): string {
  const home = siteUrl("/");
  const privacy = siteUrl("/privacy");
  const terms = siteUrl("/terms");
  return `
<tr>
  <td style="padding:28px 40px 34px 40px; border-top:1px solid ${EMAIL_COLORS.border};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td style="text-align:center; font-family:${FONT_BODY}; font-size:12px; line-height:20px; color:${EMAIL_COLORS.secondary};" align="center">
          You're receiving this because you have a Solventia account.
          <br />
          <a href="${escapeHtml(home)}" style="color:${EMAIL_COLORS.secondary}; text-decoration:underline;">Open Solventia</a>
          &nbsp;·&nbsp;
          <a href="${escapeHtml(privacy)}" style="color:${EMAIL_COLORS.secondary}; text-decoration:underline;">Privacy</a>
          &nbsp;·&nbsp;
          <a href="${escapeHtml(terms)}" style="color:${EMAIL_COLORS.secondary}; text-decoration:underline;">Terms</a>
          <br /><br />
          Questions? Write to <a href="mailto:solventia.in@gmail.com" style="color:${EMAIL_COLORS.secondary}; text-decoration:underline;">solventia.in@gmail.com</a>
          <br /><br />
          © ${new Date().getFullYear()} Solventia
        </td>
      </tr>
    </table>
  </td>
</tr>`;
}

export function primaryCta(href: string, label: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
  <tr>
    <td style="border-radius:12px; background-color:${EMAIL_COLORS.navy};">
      <a href="${escapeHtml(href)}" style="display:inline-block; padding:14px 30px; font-family:${FONT_BODY}; font-size:16px; font-weight:bold; color:#FFFFFF; text-decoration:none; border-radius:12px;">${escapeHtml(label)} &rarr;</a>
    </td>
  </tr>
</table>`;
}

export function metricStrip(cells: { label: string; value: string }[]): string {
  const cols = cells
    .map(
      (c, i) => `
      <td style="padding:14px 12px; text-align:center; ${i > 0 ? `border-left:1px solid ${EMAIL_COLORS.border};` : ""}" align="center">
        <div style="font-family:${FONT_BODY}; font-size:10px; font-weight:bold; letter-spacing:0.1em; text-transform:uppercase; color:${EMAIL_COLORS.secondary};">${escapeHtml(c.label)}</div>
        <div style="margin-top:4px; font-family:${FONT_HEADING}; font-size:16px; font-weight:700; color:${EMAIL_COLORS.navy};">${escapeHtml(c.value)}</div>
      </td>`,
    )
    .join("");
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_COLORS.border}; border-radius:12px; background-color:${EMAIL_COLORS.cream};">
  <tr>${cols}</tr>
</table>`;
}

/** The flagship idea — navy background, white/champagne text, visually
 * distinct from the two lighter secondary cards below it. Fit score is
 * shown only when a real, already-computed number is passed in — never
 * fabricated for display. */
export function primaryIdeaCard(opts: {
  title: string;
  oneLiner: string;
  fitScore: number | null;
}): string {
  const fit =
    opts.fitScore !== null
      ? `<span style="font-family:${FONT_BODY}; font-size:13px; font-weight:bold; color:${EMAIL_COLORS.champagne};">${Math.round(opts.fitScore)}% fit</span>`
      : "";
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:14px; background-color:${EMAIL_COLORS.navy};">
  <tr>
    <td style="padding:22px 24px;">
      <div style="font-family:${FONT_BODY}; font-size:11px; font-weight:bold; letter-spacing:0.12em; text-transform:uppercase; color:${EMAIL_COLORS.champagne};">Your Strongest Match</div>
      <div style="margin-top:8px; font-family:${FONT_HEADING}; font-size:24px; line-height:1.25; font-weight:700; color:#FFFFFF;">${escapeHtml(opts.title)}</div>
      <div style="margin-top:8px; font-family:${FONT_BODY}; font-size:14px; line-height:21px; color:#D9DBE8;">${escapeHtml(opts.oneLiner)}</div>
      ${fit ? `<div style="margin-top:12px;">${fit}</div>` : ""}
    </td>
  </tr>
</table>`;
}

export function secondaryIdeaCard(opts: { title: string; oneLiner: string }): string {
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${EMAIL_COLORS.border}; border-radius:12px; background-color:${EMAIL_COLORS.surface};">
  <tr>
    <td style="padding:16px 18px;">
      <div style="font-family:${FONT_HEADING}; font-size:16px; font-weight:700; color:${EMAIL_COLORS.textPrimary};">${escapeHtml(opts.title)}</div>
      <div style="margin-top:5px; font-family:${FONT_BODY}; font-size:13px; line-height:19px; color:${EMAIL_COLORS.secondary};">${escapeHtml(opts.oneLiner)}</div>
    </td>
  </tr>
</table>`;
}

export function spacer(px: number): string {
  return `<div style="line-height:${px}px; font-size:${px}px;">&nbsp;</div>`;
}

/** Hidden preheader — the snippet Gmail/Apple Mail show next to the
 * subject line in the inbox list, before the email is opened. Must be
 * real, specific text (70-100 chars), never the boilerplate "view this
 * email in your browser" default clients fall back to without one. */
export function hiddenPreheader(text: string): string {
  return `<div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">${escapeHtml(text)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`;
}

/** Wraps a body (already-built inner <tr> rows) in the one canonical
 * outer shell every Solventia email uses — cream page background, a
 * centered 600px white surface with a soft border and rounded corners
 * (Outlook ignores border-radius silently; every other client honors
 * it), header and footer always included so no email can ship without
 * them. */
export function emailShell(opts: { preheader: string; bodyRowsHtml: string }): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>Solventia</title>
  </head>
  <body style="margin:0; padding:0; background-color:${EMAIL_COLORS.bgOuter}; -webkit-text-size-adjust:100%; text-size-adjust:100%;">
    ${hiddenPreheader(opts.preheader)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${EMAIL_COLORS.bgOuter};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%; max-width:600px; background-color:${EMAIL_COLORS.surface}; border:1px solid ${EMAIL_COLORS.border}; border-radius:20px;">
            ${emailHeader()}
            ${opts.bodyRowsHtml}
            ${emailFooter()}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
