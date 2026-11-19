import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useIskurApplications } from "@/hooks/use-iskur-applications";
import {
  getIskurApplications,
  replaceIskurUnitSkills,
} from "@/lib/client/iskur-onboarding";
import {
  applications,
  ETKI,
  GORSEL,
  KREATIF,
  MERT,
} from "@test/fixtures/iskur-onboarding";
import { queryWrapper } from "@test/fixtures/query-wrapper";

vi.mock("@/lib/client/iskur-onboarding", () => ({
  getIskurApplications: vi.fn(),
  replaceIskurUnitSkills: vi.fn(),
}));

async function renderLoaded() {
  const { wrapper } = queryWrapper();
  const view = renderHook(() => useIskurApplications("p1"), { wrapper });
  await waitFor(() => expect(view.result.current.units).not.toHaveLength(0));
  return view;
}

describe("useIskurApplications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurApplications).mockResolvedValue(applications());
  });

  it("finds an intern's form and names their units and skills", async () => {
    const { result } = await renderLoaded();
    expect(result.current.submittedCount).toBe(1);
    expect(result.current.drafts).toBe(2);
    expect(result.current.weeklyDaysOf(MERT)).toBe(3);
    expect(result.current.weeklyDaysOf("someone-else")).toBeNull();
    expect(result.current.unitName(KREATIF)).toBe("Kreatif ve Dijital Üretim");
    expect(result.current.skillName(GORSEL)).toBe("Görsel tasarım");
    expect(result.current.skillName("x")).toBeNull();
  });

  it("edits a unit's skills and refuses too many", async () => {
    vi.mocked(replaceIskurUnitSkills).mockResolvedValue(applications());
    const { result } = await renderLoaded();
    act(() => result.current.editSkills(ETKI));
    expect(result.current.editing).toEqual({ unitId: ETKI, text: "" });

    act(() =>
      result.current.setSkillsText(
        Array.from({ length: 31 }, (_, i) => `S${i}`).join("\n"),
      ),
    );
    expect(result.current.namesValid).toBe(false);
    act(() => result.current.saveSkills());
    expect(replaceIskurUnitSkills).not.toHaveBeenCalled();

    act(() =>
      result.current.setSkillsText("Etkinlik organizasyonu\nProje yönetimi"),
    );
    act(() => result.current.saveSkills());
    await waitFor(() => expect(result.current.editing).toBeNull());
    expect(replaceIskurUnitSkills).toHaveBeenCalledWith("p1", ETKI, [
      "Etkinlik organizasyonu",
      "Proje yönetimi",
    ]);

    act(() => result.current.editSkills(KREATIF));
    act(() => result.current.cancelSkills());
    expect(result.current.editing).toBeNull();
  });
});
