"use client";

import { useState } from "react";

/**
 * Whether a photo has loaded, so the initials under it can step aside, and whether it failed, so it is dropped.
 * Keyed by the address: a new photo starts over instead of inheriting the last one's failure.
 */
export function useImageFallback(src: string | null) {
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const usable = src !== null && src !== failedSrc ? src : null;
  return {
    src: usable,
    shown: usable !== null && usable === loadedSrc,
    onLoad: () => setLoadedSrc(usable),
    onError: () => setFailedSrc(usable),
  };
}
