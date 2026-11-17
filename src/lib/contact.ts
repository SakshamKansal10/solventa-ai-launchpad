/** The one address shown everywhere and used for every email (owner, 2026-11-16). Mail to it is
 * forwarded (ImprovMX, live 2026-11-17), so it is also every email's reply-to — no other
 * address appears on the site, the legal pages or in an email. */
export const CONTACT_EMAIL = "sol@solventia.in";

/** Every email's sender: displays as "Solventia" in every inbox, never a Resend/Supabase name. */
export const EMAIL_FROM = `Solventia <${CONTACT_EMAIL}>`;

/** Replies to any email go to the same address. */
export const EMAIL_REPLY_TO = CONTACT_EMAIL;
