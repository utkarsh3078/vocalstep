import { signInWithGoogle } from "@/app/actions/auth";
import { auth } from "@/config/auth";

/** "Continue with Google", shown only when Google sign-in is switched on in config. */
export function GoogleButton({ next }: { next: string }) {
  if (!auth.google) return null;

  return (
    <form action={signInWithGoogle} className="mt-6">
      <p aria-hidden="true" className="mb-6 flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </p>
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className="w-full rounded-full border border-line bg-surface px-5 py-3.5 font-medium transition-colors hover:border-faint"
      >
        Continue with Google
      </button>
    </form>
  );
}
