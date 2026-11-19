import { signInWithGoogle } from "@/app/actions/auth";
import { auth } from "@/config/auth";

/** "Continue with Google", shown only when Google sign-in is switched on in config. */
export function GoogleButton({ next }: { next: string }) {
  if (!auth.google) return null;

  return (
    <form action={signInWithGoogle} className="mt-6">
      <input type="hidden" name="next" value={next} />
      <button
        type="submit"
        className="w-full rounded-md border border-neutral-400 px-5 py-3 font-medium hover:bg-neutral-100"
      >
        Continue with Google
      </button>
    </form>
  );
}
