/**
 * Friendly messages for Supabase Auth error codes. Unknown codes get a general
 * message; the raw error is never shown, as it can reveal too much.
 * Codes: https://supabase.com/docs/guides/auth/debugging/error-codes
 */
const MESSAGES: Record<string, string> = {
  invalid_credentials: "That email and password don't match. Check them and try again.",
  email_not_confirmed:
    "Please confirm your email first. Open the link we sent you, then sign in.",
  user_already_exists: "An account with this email already exists. Try signing in.",
  email_exists: "An account with this email already exists. Try signing in.",
  weak_password: "That password is too easy to guess. Choose a longer or less common one.",
  same_password: "Your new password must be different from the old one.",
  over_email_send_rate_limit:
    "Too many emails were sent just now. Please wait a few minutes and try again.",
  over_request_rate_limit: "Too many attempts. Please wait a few minutes and try again.",
  signup_disabled: "New sign-ups are closed at the moment.",
  email_address_invalid: "That email address can't be used. Try a different one.",
  otp_expired: "This link has expired or was already used. Please ask for a new one.",
  session_not_found: "Your session has ended. Please sign in again.",
  session_expired: "Your session has ended. Please sign in again.",
  provider_disabled: "This sign-in method is not available.",
};

export const GENERIC_AUTH_ERROR = "Something went wrong. Please try again in a moment.";

export function authErrorMessage(code: string | undefined | null): string {
  return code && Object.hasOwn(MESSAGES, code) ? MESSAGES[code] : GENERIC_AUTH_ERROR;
}
