import Image from "next/image";

import logo from "@/assets/logo.png";

/**
 * The VocalStep mark: a speaking head with a mint sound wave, on a white tile
 * (the light version, for the light site).
 * Decorative: the word "VocalStep" beside it carries the name. The same
 * picture is the favicon and app icon (src/app/favicon.ico, icon.png,
 * apple-icon.png).
 */
export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <Image
      src={logo}
      alt=""
      // Shown at 24–32 px; this covers sharp screens.
      sizes="64px"
      // In the header, so it is needed straight away.
      loading="eager"
      // A faint outline keeps the white tile visible on the grey canvas.
      className={`${className} rounded-[28%] ring-1 ring-line`}
    />
  );
}
