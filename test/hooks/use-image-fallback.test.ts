import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useImageFallback } from "@/hooks/use-image-fallback";

describe("useImageFallback", () => {
  it("offers the photo but keeps the initials until it has loaded", () => {
    const { result } = renderHook(() => useImageFallback("/a.png"));

    expect(result.current.src).toBe("/a.png");
    expect(result.current.shown).toBe(false);

    act(() => result.current.onLoad());

    expect(result.current.shown).toBe(true);
  });

  it("drops a photo that failed to load", () => {
    const { result } = renderHook(() => useImageFallback("/a.png"));

    act(() => result.current.onError());

    expect(result.current.src).toBeNull();
    expect(result.current.shown).toBe(false);
  });

  it("gives a new photo a fresh try after the last one failed", () => {
    const { result, rerender } = renderHook(
      ({ src }) => useImageFallback(src),
      { initialProps: { src: "/a.png" } },
    );
    act(() => result.current.onError());

    rerender({ src: "/b.png" });

    expect(result.current.src).toBe("/b.png");
    expect(result.current.shown).toBe(false);
  });

  it("has nothing to show without an address", () => {
    const { result } = renderHook(() => useImageFallback(null));

    expect(result.current.src).toBeNull();
    expect(result.current.shown).toBe(false);
  });
});
