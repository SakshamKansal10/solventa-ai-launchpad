/** The ONE color/type system every transactional email in this app uses —
 * matches the approved Solventia brand exactly (no invented tones), tuned
 * for real email-client rendering: no CSS variables, no oklch (Outlook's
 * Word engine and older clients don't parse either), plain hex only. */
export const EMAIL_COLORS = {
  bgOuter: "#F7F8FA",
  surface: "#FFFFFF",
  border: "#E1E5EB",
  textPrimary: "#171B22",
  navy: "#101C32",
  secondary: "#596273",
  champagne: "#C5A36A",
  cobalt: "#315EDB",
  cobaltSoft: "#EAF0FD",
  cream: "#F7F8FA",
} as const;

// One sans-serif stack for headings and body, like the product (no serif display
// type) — no web fonts, since @font-face support is inconsistent across email
// clients and a fallback-only stack renders identically everywhere.
export const FONT_HEADING = "Helvetica, Arial, sans-serif";
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
