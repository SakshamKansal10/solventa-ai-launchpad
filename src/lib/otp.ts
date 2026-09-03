/**
 * Supabase's email OTP length is a project-level setting
 * (GOTRUE_MAILER_OTP_LENGTH, Dashboard → Authentication → Email),
 * documented as configurable between 6 and 10 characters — and its
 * default has changed across Supabase's own provisioning eras (older
 * projects default to 6, newer ones to 8). There is no fixed length this
 * app can assume; hardcoding 6 here (as this file's previous version did)
 * is exactly what silently truncated a real 8-character code down to 6
 * via a maxLength attribute, making it impossible to enter. The UI
 * accepts whatever Supabase actually issues — these bounds exist only to
 * catch an obviously-too-short/too-long paste, never to enforce one
 * specific length.
 */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

/** Strips whitespace only — never assumes a character set, since a
 * project's configured OTP format isn't guaranteed to be purely numeric. */
export function sanitizeOtpInput(raw: string): string {
  return raw.replace(/\s/g, "");
}

export function isOtpLengthPlausible(code: string): boolean {
  return code.length >= OTP_MIN_LENGTH && code.length <= OTP_MAX_LENGTH;
}
