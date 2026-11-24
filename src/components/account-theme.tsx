"use client";

import { useEffect, useRef } from "react";

import { saveSiteTheme } from "@/app/actions/preferences";
import { currentTheme, rememberTheme, storedTheme, watchThemeChoice, type SiteTheme } from "@/lib/theme";

/**
 * For a signed-in user (rendered by the header only then):
 * - shows the theme saved to their profile, so after signing in on any device
 *   the site switches to it, and keeps it in this browser for the next visit;
 * - saves each theme they pick (header or teleprompter button) to the profile.
 *
 * Saves run one at a time, and only the latest choice is sent. While a choice
 * is still being saved, the profile's older value is not applied over it.
 */
export function AccountTheme({ saved }: { saved: SiteTheme | null }) {
  const sending = useRef(false);
  const next = useRef<SiteTheme | null>(null);

  useEffect(() => {
    if (!saved || sending.current || next.current) return;
    if (saved !== currentTheme() || saved !== storedTheme()) rememberTheme(saved);
  }, [saved]);

  useEffect(() => {
    let stopped = false;
    const send = () => {
      const theme = next.current;
      if (stopped || sending.current || !theme) return;
      next.current = null;
      sending.current = true;
      saveSiteTheme(theme)
        .then((result) => {
          // Signed out meanwhile: the choice stays in this browser only.
          if ("error" in result && result.error === "unauthorized") stopped = true;
        })
        .catch(() => {
          // Offline: the choice stays in this browser; the next choice tries again.
        })
        .finally(() => {
          sending.current = false;
          send();
        });
    };

    const unsubscribe = watchThemeChoice((theme) => {
      next.current = theme;
      send();
    });
    return () => {
      stopped = true;
      unsubscribe();
    };
  }, []);

  return null;
}
