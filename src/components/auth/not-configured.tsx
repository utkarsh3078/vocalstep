/** Shown on sign-in pages while Supabase has not been set up for this site. */
export function NotConfigured() {
  return (
    <p role="status" className="rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
      Accounts are not set up on this site yet. You can still practise the sample speeches
      without an account.
    </p>
  );
}
