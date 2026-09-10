/** The ONE color/type system every transactional email in this app uses —
 * matches the approved Solventia brand exactly (no invented tones), tuned
 * for real email-client rendering: no CSS variables, no oklch (Outlook's
 * Word engine and older clients don't parse either), plain hex only. */
export const EMAIL_COLORS = {
  bgOuter: "#F4EFE7",
  surface: "#FFFDF9",
  border: "#E5DDD1",
  textPrimary: "#151827",
  navy: "#17203D",
  secondary: "#67616A",
  champagne: "#C5A36A",
  violet: "#7257D8",
  violetSoft: "#F5F1FD",
  cream: "#F7F2EA",
} as const;

// Georgia/Times/serif for display text, Arial/Helvetica/sans-serif for
// body — no web fonts, since @font-face support is inconsistent across
// email clients and a fallback-only stack renders identically everywhere.
export const FONT_HEADING = "Georgia, 'Times New Roman', Times, serif";
export const FONT_BODY = "Arial, Helvetica, sans-serif";

export const BRAND_TAGLINE = "VALIDATE • BUILD • ELEVATE";
export const SUPPORT_EMAIL = "solventia.in@gmail.com";

/** Every dynamic value (a founder's name, an AI-generated opportunity
 * title) is interpolated into raw HTML below — this is the one place
 * that happens safely. Never skip it for a value that didn't originate
 * as a hardcoded literal in this codebase. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
