/** Sign-in options and the pages that need an account. */
export const auth = {
  /**
   * Shows "Continue with Google". Turn on only after Google OAuth is set up in
   * Supabase (Authentication > Sign In / Providers > Google). See the README.
   */
  google: false,

  password: {
    /** Supabase rejects shorter passwords too; keep both in step. */
    minLength: 8,
    /** bcrypt, which Supabase uses, ignores anything past 72 bytes. */
    maxLength: 72,
  },

  /** Where users land after signing in when there is no page to return to. */
  defaultRedirect: "/account",

  /**
   * Address prefixes that need an account. The proxy sends signed-out visitors
   * to the login page, and each page checks the session again on the server.
   */
  protectedPaths: ["/account", "/reset-password"],
} as const;
