import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useSectionProgress } from "@/hooks/use-section-progress";

const IDS = ["one", "two", "three"] as const;

function place(tops: Record<string, number>) {
  for (const id of IDS) {
    const section = document.getElementById(id);
    if (!section) continue;
    vi.spyOn(section, "getBoundingClientRect").mockReturnValue(
      new DOMRect(0, tops[id] ?? 0, 0, 0),
    );
  }
}

describe("useSectionProgress", () => {
  beforeEach(() => {
    document.body.innerHTML = IDS.map((id) => `<div id="${id}"></div>`).join(
      "",
    );
    vi.stubGlobal("scrollY", 0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("starts at the first section and follows the scroll", async () => {
    place({ one: 0, two: 2000, three: 4000 });
    const { result } = renderHook(() => useSectionProgress(IDS));
    expect(result.current).toBe(0);

    place({ one: -2000, two: 10, three: 2000 });
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    await waitFor(() => expect(result.current).toBe(1));
  });

  it("names the last section at the end of the page, however short it is", async () => {
    place({ one: -4000, two: -100, three: 700 });
    const { result } = renderHook(() => useSectionProgress(IDS));
    vi.stubGlobal("scrollY", 5000);
    act(() => {
      window.dispatchEvent(new Event("scroll"));
    });
    await waitFor(() => expect(result.current).toBe(2));
  });
});
