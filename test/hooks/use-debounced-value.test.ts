import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "@/hooks/use-debounced-value";

describe("useDebouncedValue", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives the new value only once it has stopped changing", async () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebouncedValue(value, 300),
      {
        initialProps: { value: "A" },
      },
    );

    rerender({ value: "Ay" });
    await act(() => vi.advanceTimersByTimeAsync(200));
    rerender({ value: "Ayş" });
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(result.current).toBe("A");

    await act(() => vi.advanceTimersByTimeAsync(100));
    expect(result.current).toBe("Ayş");
  });
});
