import { siteUrl } from "@/lib/actions/site-url.server";
import { escapeHtml, SUPPORT_EMAIL } from "@/lib/email/brand";

/**
 * The ONE layout of every email the app sends (Job E, owner 2026-11-16), implemented from the
 * approved kit (solventia-email-kit/email-kit/app/*.html — not redesigned): a 600px white card on
 * a pale page, 40px side padding (24px on phones), the logo PNG (40px, absolute URL) and the
 * SOLVENTIA wordmark as live text, a 2px hairline (56px gold, then grey), then a small blue label,
 * the headline (28px, 24px on phones), text, at most one panel or numbered list, ONE navy button,
 * an optional quiet note, and the footer (help line with sol@solventia.in, why they got it, the
 * tagline, links; reminders add "Change reminders"). Table-based, inline styles, the kit's
 * <style> block for phones and dark mode, a hidden preheader, and a plain-text part.
 *
 * Colours are the kit's, except navy and blue, which use the site's tokens (the owner's rule: the
 * site wins where they differ) — --sol-navy #101C32 and --sol-cobalt #315EDB.
 */
export const EMAIL_KIT_COLORS = {
  navy: "#101C32", // site --sol-navy (kit #14214C)
  ink: "#0E1A40",
  text: "#3B4666",
  muted: "#6B7591",
  blue: "#315EDB", // site --sol-cobalt (kit #2F55D4)
  gold: "#D8A93F",
  page: "#F3F5FA",
  panel: "#F4F7FE",
  panelBorder: "#DDE5F8",
  rule: "#E7EAF2",
  cardBorder: "#E4E8F1",
} as const;

/** Where the email's logo lives (public/brand/email-logo.png): PNG, never SVG or base64. */
export const EMAIL_LOGO_PATH = "/brand/email-logo.png";

export type EmailLocale = "en" | "hi";

export interface EmailContent {
  locale: EmailLocale;
  /** The <title> (shown by a few clients). */
  title: string;
  /** The grey preview line in the inbox. */
  preheader: string;
  /** The small blue label above the headline. */
  eyebrow: string;
  headline: string;
  /** Plain text paragraphs (escaped here). */
  paragraphs: string[];
  /** One panel (the weekly reminder's mission, the roadmap's week 1)… */
  panel?: { eyebrow?: string; title: string; meta?: string };
  /** …or one numbered list (the three directions). */
  list?: { title: string; line: string }[];
  /** The ONE button: a deep link to the exact page. */
  button: { href: string; label: string };
  /** A quiet line under the button. */
  note?: string;
  /** "You got this email because …" */
  reason: string;
  /** Reminder emails: the "Change reminders" link (replaces Terms in the footer, as in the kit). */
  changeRemindersUrl?: string;
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,'Noto Sans Devanagari',sans-serif";
const WORDMARK_FONT = "Montserrat,'Segoe UI',Helvetica,Arial,sans-serif";

const FOOTER: Record<
  EmailLocale,
  { ask: (a: string) => string; privacy: string; terms: string; change: string }
> = {
  en: {
    ask: (a) => `Questions? Write to ${a}.`,
    privacy: "Privacy",
    terms: "Terms",
    change: "Change reminders",
  },
  hi: {
    ask: (a) => `कोई सवाल? ${a} पर लिखें।`,
    privacy: "प्राइवेसी",
    terms: "शर्तें",
    change: "रिमाइंडर बदलें",
  },
};

/** The kit's <head> styles: phones (≤620px) and dark mode. Blues/navy follow EMAIL_KIT_COLORS. */
function headStyles(): string {
  const c = EMAIL_KIT_COLORS;
  return `body { margin:0; padding:0; width:100% !important; background:${c.page}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table { border-collapse:collapse; mso-table-lspace:0; mso-table-rspace:0; }
    img { border:0; outline:none; text-decoration:none; -ms-interpolation-mode:bicubic; }
    a { color:${c.blue}; }
    @media only screen and (max-width:620px) {
      .sol-card { width:100% !important; border-radius:0 !important; border-left:0 !important; border-right:0 !important; }
      .sol-px { padding-left:24px !important; padding-right:24px !important; }
      .sol-h1 { font-size:24px !important; line-height:31px !important; }
      .sol-code { font-size:30px !important; letter-spacing:8px !important; }
      .sol-outer { padding:0 !important; }
    }
    @media (prefers-color-scheme: dark) {
      body, .sol-bg { background:#0A1024 !important; }
      .sol-card { background:#111A33 !important; border-color:#24325C !important; }
      .sol-word, .sol-h1, .sol-strong { color:#F3F6FF !important; }
      .sol-p { color:#C6CDE2 !important; }
      .sol-muted, .sol-muted a { color:#8E99B8 !important; }
      .sol-eyebrow, .sol-link { color:#8FA8FF !important; }
      .sol-panel { background:#18244A !important; border-color:#2B3B70 !important; }
      .sol-rule { background:#24325C !important; }
      .sol-btn { background:#3D63E6 !important; }
      .sol-btn a { border-color:#3D63E6 !important; }
      .sol-num { background:#24325C !important; border-color:#2B3B70 !important; color:#F3F6FF !important; }
      .sol-rule-row { border-top-color:#24325C !important; }
    }`;
}

/** Renders one email: the HTML (the kit's layout) and its plain-text part. */
export function renderEmail(m: EmailContent): { html: string; text: string } {
  const c = EMAIL_KIT_COLORS;
  const e = escapeHtml;
  const hi = m.locale === "hi";
  // Devanagari needs a little more line height (the kit's Hindi example).
  const pLine = hi ? 28 : 26;
  const mutedLine = hi ? 24 : 22;
  const f = FOOTER[m.locale];
  // Signed-in pages, never the homepage (owner, 2026-11-16: every email link is a deep link).
  const home = siteUrl("/dashboard");
  const logo = siteUrl(EMAIL_LOGO_PATH);
  const privacy = siteUrl("/privacy");
  const terms = siteUrl("/terms");
  const link = (href: string, label: string) =>
    `<a href="${e(href)}" target="_blank" style="color:${c.muted};text-decoration:underline;">${e(label)}</a>`;

  const paragraphs = m.paragraphs
    .map(
      (p, i) =>
        `<p class="sol-p" style="margin:0px 0 ${i === m.paragraphs.length - 1 ? 16 : 12}px 0;font-family:${FONT};font-size:16px;line-height:${pLine}px;color:${c.text};">${e(p)}</p>`,
    )
    .join("");

  const panel = m.panel
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px 0;">
                <tr>
                  <td class="sol-panel" bgcolor="${c.panel}" style="background:${c.panel};border:1px solid ${c.panelBorder};border-radius:12px;padding:22px 24px;">
                    ${m.panel.eyebrow ? `<div class="sol-eyebrow" style="font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${c.blue};padding-bottom:8px;">${e(m.panel.eyebrow)}</div>` : ""}<div class="sol-strong" style="font-family:${FONT};font-size:19px;line-height:27px;font-weight:600;color:${c.navy};">${e(m.panel.title)}</div>${m.panel.meta ? `<div class="sol-muted" style="font-family:${FONT};font-size:14px;line-height:${mutedLine}px;color:${c.muted};padding-top:8px;">${e(m.panel.meta)}</div>` : ""}
                  </td>
                </tr>
              </table>`
    : "";

  const list = m.list?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px 0;">
${m.list
  .map((item, i) => {
    const rule = i === 0 ? "" : `border-top:1px solid ${c.rule};`;
    return `<tr>
                  <td class="sol-rule-row" width="44" valign="top" style="padding:16px 0 16px 0;${rule}">
                    <div class="sol-num" style="width:30px;height:30px;line-height:30px;border-radius:15px;background:${c.panel};border:1px solid ${c.panelBorder};font-family:${FONT};font-size:14px;font-weight:700;color:${c.navy};text-align:center;">${i + 1}</div>
                  </td>
                  <td valign="top" style="padding:16px 0 16px 0;${rule}">
                    <div class="sol-strong" style="font-family:${FONT};font-size:17px;line-height:24px;font-weight:600;color:${c.navy};">${e(item.title)}</div>
                    <div class="sol-p" style="font-family:${FONT};font-size:15px;line-height:23px;color:${c.text};padding-top:2px;">${e(item.line)}</div>
                  </td>
                </tr>`;
  })
  .join("\n")}
</table>`
    : "";

  const button = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 8px 0;">
                <tr>
                  <td class="sol-btn" bgcolor="${c.navy}" style="background:${c.navy};border-radius:10px;">
                    <a href="${e(m.button.href)}" target="_blank" data-email-button="" style="display:inline-block;padding:15px 28px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:600;color:#FFFFFF;text-decoration:none;border:1px solid ${c.navy};border-radius:10px;">${e(m.button.label)}&nbsp;&nbsp;&rarr;</a>
                  </td>
                </tr>
              </table>`;

  const note = m.note
    ? `<p class="sol-muted" style="margin:12px 0 0px 0;font-family:${FONT};font-size:14px;line-height:${mutedLine}px;color:${c.muted};">${e(m.note)}</p>`
    : "";

  const footerLinks = [
    link(home, "solventia.in"),
    link(privacy, f.privacy),
    m.changeRemindersUrl ? link(m.changeRemindersUrl, f.change) : link(terms, f.terms),
  ].join(" &nbsp;&middot;&nbsp; ");

  const html = `<!DOCTYPE html>
<html lang="${m.locale}" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${e(m.title)}</title>
  <!--[if mso]><style>* { font-family: 'Segoe UI', Arial, sans-serif !important; }</style><![endif]-->
  <style>
    ${headStyles()}
  </style>
</head>
<body class="sol-bg" style="margin:0;padding:0;background:${c.page};">
  <!-- Preheader: the grey preview line in the inbox -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${c.page};">${e(m.preheader)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>

  <table role="presentation" class="sol-bg" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${c.page}" style="background:${c.page};">
    <tr>
      <td class="sol-outer" align="center" style="padding:32px 12px 40px 12px;">

        <!-- Card -->
        <table role="presentation" class="sol-card" width="600" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="width:600px;max-width:600px;background:#FFFFFF;border:1px solid ${c.cardBorder};border-radius:16px;">

          <!-- Header: logo + wordmark -->
          <tr>
            <td class="sol-px" style="padding:28px 40px 22px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right:12px;">
                    <a href="${e(home)}" target="_blank" style="text-decoration:none;"><img src="${e(logo)}" width="40" height="40" alt="Solventia" style="display:block;width:40px;height:40px;border-radius:9px;"></a>
                  </td>
                  <td valign="middle">
                    <a href="${e(home)}" target="_blank" class="sol-word" style="font-family:${WORDMARK_FONT};font-size:17px;line-height:20px;font-weight:600;letter-spacing:5px;color:${c.ink};text-decoration:none;">SOLVENTIA</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hairline: gold start, then grey (the line the logo is revealed on) -->
          <tr>
            <td class="sol-px" style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="56" height="2" bgcolor="${c.gold}" style="background:${c.gold};font-size:0;line-height:0;">&nbsp;</td>
                  <td class="sol-rule" height="2" bgcolor="${c.rule}" style="background:${c.rule};font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="sol-px" style="padding:32px 40px 28px 40px;">
              <div class="sol-eyebrow" style="font-family:${FONT};font-size:12px;line-height:16px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${c.blue};padding-bottom:10px;">${e(m.eyebrow)}</div>
              <h1 class="sol-h1" style="margin:0 0 16px 0;font-family:${FONT};font-size:28px;line-height:36px;font-weight:700;letter-spacing:-0.4px;color:${c.navy};">${e(m.headline)}</h1>
              ${paragraphs}${list}${panel}${button}${note}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="sol-px" style="padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="sol-rule" height="1" bgcolor="${c.rule}" style="background:${c.rule};font-size:0;line-height:0;">&nbsp;</td></tr></table>
            </td>
          </tr>
          <tr>
            <td class="sol-px" style="padding:22px 40px 30px 40px;">
              <p class="sol-muted" style="margin:0 0 6px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${c.muted};">${f.ask(`<a href="mailto:${SUPPORT_EMAIL}" style="color:${c.muted};text-decoration:underline;">${SUPPORT_EMAIL}</a>`)}</p>
              <p class="sol-muted" style="margin:0 0 14px 0;font-family:${FONT};font-size:13px;line-height:20px;color:${c.muted};">${e(m.reason)}</p>
              <p class="sol-muted" style="margin:0;font-family:${FONT};font-size:12px;line-height:18px;color:${c.muted};">
                <span style="letter-spacing:1.4px;">VALIDATE <span style="color:${c.gold};">&bull;</span> BUILD <span style="color:${c.gold};">&bull;</span> ELEVATE</span><br>
                ${footerLinks}
              </p>
            </td>
          </tr>
        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    "SOLVENTIA",
    "",
    m.headline,
    "",
    ...m.paragraphs.flatMap((p) => [p, ""]),
    ...(m.list ?? []).flatMap((item, i) => [`${i + 1}. ${item.title}`, `   ${item.line}`, ""]),
    ...(m.panel
      ? [m.panel.eyebrow, m.panel.title, m.panel.meta, ""].filter(
          (x): x is string => x !== undefined,
        )
      : []),
    `${m.button.label}: ${m.button.href}`,
    "",
    ...(m.note ? [m.note, ""] : []),
    "--",
    f.ask(SUPPORT_EMAIL),
    m.reason,
    "VALIDATE • BUILD • ELEVATE",
    m.changeRemindersUrl ? `${f.change}: ${m.changeRemindersUrl}` : `${f.privacy}: ${privacy}`,
  ].join("\n");

  return { html, text };
}

/** The first word of a name, or null. */
export function firstNameOf(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first ? first.slice(0, 40) : null;
}
