import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DataCell, DataTable } from "@/components/ia/data-table";
import { ChipSelect, ToggleChip } from "@/components/ia/filter-chip";
import { Footnote } from "@/components/ia/footnote";
import { InitialsAvatar } from "@/components/ia/initials-avatar";
import { SearchInput } from "@/components/ia/search-input";
import { SegmentedTabs } from "@/components/ia/segmented-tabs";
import { StatCard } from "@/components/ia/stat-card";
import { StatusTone } from "@/components/ia/status-badge";
import { STATUS_DOT_ICON, StatusPill } from "@/components/ia/status-pill";
import { UnderlineTabs } from "@/components/ia/underline-tabs";

enum Fruit {
  All = "ALL",
  Apple = "APPLE",
}

describe("IA kit: lists and filters", () => {
  it("shows a status with its icon and label, and a count card with its label", () => {
    render(
      <>
        <StatusPill tone={StatusTone.Warning} icon="/ia/icons/hourglass.svg">
          Onay Bekliyor
        </StatusPill>
        <StatCard
          tone={StatusTone.Info}
          label="Alternatif Saat Önerildi"
          value={12}
        />
      </>,
    );

    expect(screen.getByText("Onay Bekliyor")).toHaveClass(
      "bg-status-warning-bg",
    );
    expect(screen.getByText("Alternatif Saat Önerildi")).toBeInTheDocument();
    expect(screen.getByText("12")).toHaveClass("type-metric");
  });

  it("draws a running status's dot at its own 8 px and a line icon at 16 px", () => {
    const { container } = render(
      <>
        <StatusPill tone={StatusTone.Success} icon={STATUS_DOT_ICON}>
          Aktif
        </StatusPill>
        <StatusPill tone={StatusTone.Info} icon="/ia/icons/time.svg">
          Alternatif Saat Önerildi
        </StatusPill>
      </>,
    );

    const [dot, line] = container.querySelectorAll("img");
    expect(dot).toHaveAttribute("width", "8");
    expect(line).toHaveAttribute("width", "16");
  });

  it("reports what is typed into the search field, which keeps its label for screen readers", async () => {
    const onChange = vi.fn<(value: string) => void>();
    render(
      <SearchInput
        label="Ara"
        placeholder="Öğrenci ara"
        value=""
        onChange={onChange}
      />,
    );

    await userEvent.type(screen.getByRole("searchbox", { name: "Ara" }), "A");
    expect(onChange).toHaveBeenCalledWith("A");
  });

  it("picks an option from a dropdown chip and shows the chosen label", async () => {
    const onChange = vi.fn<(value: Fruit) => void>();
    const options = [
      { value: Fruit.All, label: "Durum: Tümü" },
      { value: Fruit.Apple, label: "Elma" },
    ];
    render(
      <ChipSelect
        label="Durum"
        value={Fruit.All}
        options={options}
        onChange={onChange}
      />,
    );

    expect(screen.getByRole("combobox", { name: "Durum" })).toHaveValue("ALL");
    await userEvent.selectOptions(
      screen.getByRole("combobox", { name: "Durum" }),
      "APPLE",
    );
    expect(onChange).toHaveBeenCalledWith(Fruit.Apple);
  });

  it("toggles a chip and says whether it is on", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(
      <ToggleChip label="Bu hafta" pressed={false} onToggle={onToggle} />,
    );
    const chip = screen.getByRole("button", { name: "Bu hafta" });
    expect(chip).toHaveAttribute("aria-pressed", "false");

    await userEvent.click(chip);
    expect(onToggle).toHaveBeenCalledTimes(1);
    rerender(<ToggleChip label="Bu hafta" pressed onToggle={onToggle} />);
    expect(screen.getByRole("button", { name: "Bu hafta" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("lays out a real table with a caption, column headers, an avatar and a footnote", () => {
    render(
      <>
        <DataTable
          caption="Randevular"
          columns={[
            { key: "student", label: "Öğrenci" },
            { key: "topic", label: "Başlık", className: "w-52" },
          ]}
        >
          <tr>
            <DataCell>
              <InitialsAvatar name="Ayşe Yılmaz" />
              Ayşe Yılmaz
            </DataCell>
            <DataCell>CV</DataCell>
          </tr>
        </DataTable>
        <Footnote>Açıklama gizlidir.</Footnote>
      </>,
    );

    expect(
      screen.getByRole("table", { name: "Randevular" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Başlık" })).toHaveClass(
      "w-52",
    );
    expect(screen.getByRole("cell", { name: /Ayşe Yılmaz/ })).toHaveTextContent(
      "AY",
    );
    expect(screen.getByText("Açıklama gizlidir.")).toBeInTheDocument();
  });

  it("links the tabs that have a page, marks the current one and disables the rest", () => {
    render(
      <>
        <UnderlineTabs
          label="Bölümler"
          disabledTitle="Yakında"
          tabs={[
            {
              id: "a",
              label: "Randevular",
              href: "/a",
              count: 86,
              active: true,
            },
            {
              id: "b",
              label: "Raporlar",
              href: null,
              count: null,
              active: false,
            },
          ]}
        />
        <SegmentedTabs
          label="Katılımcılar"
          disabledTitle="Yakında"
          tabs={[
            { id: "s", label: "Öğrenciler", href: "/s", active: false },
            { id: "m", label: "Akran Mentorları", href: "/m", active: true },
            { id: "x", label: "Akademisyenler", href: null, active: false },
          ]}
        />
      </>,
    );

    const current = screen.getByRole("tab", { name: /^Randevular/ });
    expect(current).toHaveAttribute("aria-selected", "true");
    expect(current).toHaveAttribute("href", "/a");
    expect(current).toHaveTextContent("86");
    expect(screen.getByRole("tab", { name: "Raporlar" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(
      screen.getByRole("link", { name: "Akran Mentorları" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Öğrenciler" }),
    ).not.toHaveAttribute("aria-current");
    expect(screen.getByText("Akademisyenler")).toHaveAttribute(
      "title",
      "Yakında",
    );
  });
});
