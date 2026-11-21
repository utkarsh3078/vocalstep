/**
 * The VocalStep mark: three rising steps, like a voice getting stronger.
 * Decorative; the word "VocalStep" beside it carries the name.
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="10" className="fill-ink" />
      <rect x="8" y="17" width="4" height="7" rx="2" className="fill-white" />
      <rect x="14" y="12.5" width="4" height="11.5" rx="2" className="fill-white" />
      <rect x="20" y="8" width="4" height="16" rx="2" className="fill-mint-400" />
    </svg>
  );
}
