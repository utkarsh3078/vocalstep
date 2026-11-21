/** Shown on sign-in pages while Supabase has not been set up for this site. */
export function NotConfigured() {
  return (
    <p role="status" className="rounded-2xl border border-peach-200 bg-peach-50 px-4 py-3 text-peach-700">
      Accounts are not set up on this site yet. You can still practise the sample speeches
      without an account.
    </p>
  );
}
