import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { IskurInternsCard } from "@/components/coordinator/iskur-interns-card";
import { IskurInternAccountState } from "@/interfaces/iskur-interns";
import { ClientApiError } from "@/lib/client/api";
import {
  addIskurInterns,
  getIskurInterns,
  removeIskurIntern,
} from "@/lib/client/iskur-interns";
import { ISKUR_INTERN_PASTE_MAX } from "@/lib/iskur-interns";
import {
  iskurInternEntry,
  iskurInternList,
} from "@test/fixtures/iskur-interns";
import { renderWithQueryClient } from "@test/test-utils";

vi.mock("@/lib/client/iskur-interns", () => ({
  getIskurInterns: vi.fn(),
  addIskurInterns: vi.fn(),
  removeIskurIntern: vi.fn(),
}));

const PLACED_REFUSAL =
  "Bu kişi bir ekibe yerleştirilmiş; önce yerleşimden çıkar.";

const ayse = iskurInternEntry();
const yeni = iskurInternEntry({
  id: "e-yeni",
  email: "yeni@example.test",
  account: IskurInternAccountState.NotSignedUp,
  userId: null,
  fullName: null,
});
const dis = iskurInternEntry({
  id: "e-dis",
  email: "dis@example.test",
  account: IskurInternAccountState.OutsideProgram,
  userId: null,
  fullName: null,
});

async function renderCard() {
  renderWithQueryClient(<IskurInternsCard programId="p1" />);
  return screen.findByRole("list", { name: "Listedeki adresler" });
}

function rowOf(list: HTMLElement, email: string) {
  const row = within(list)
    .getAllByRole("listitem")
    .find((item) => within(item).queryByText(email));
  if (!row) throw new Error(`no row for ${email}`);
  return row;
}

describe("IskurInternsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getIskurInterns).mockResolvedValue(
      iskurInternList([ayse, dis, yeni]),
    );
  });

  it("shows each address with whether its owner has signed up", async () => {
    const list = await renderCard();

    expect(
      screen.getByRole("heading", { name: "İŞKUR stajyerleri" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("3 adres · 1 stajyer · 1 henüz kaydolmadı"),
    ).toBeInTheDocument();
    expect(within(list).getAllByRole("listitem")).toHaveLength(3);
    const intern = rowOf(list, "ayse@example.test");
    expect(within(intern).getByText("Ayşe Yıldız")).toBeInTheDocument();
    expect(within(intern).getByText("Kayıtlı")).toBeInTheDocument();
    expect(
      within(rowOf(list, "dis@example.test")).getByText(
        "Hesap var, programda değil",
      ),
    ).toBeInTheDocument();
    expect(
      within(rowOf(list, "yeni@example.test")).getByText("Henüz kaydolmadı"),
    ).toBeInTheDocument();
  });

  it("adds the pasted addresses and keeps the unreadable ones in the box", async () => {
    vi.mocked(addIskurInterns).mockResolvedValue(
      iskurInternList([ayse, yeni], ["adres-degil"]),
    );
    await renderCard();
    const box = screen.getByLabelText("Eklenecek e-posta adresleri");

    fireEvent.change(box, {
      target: { value: "Yeni@Example.test, yeni@example.test\nadres-degil" },
    });
    await userEvent.click(screen.getByRole("button", { name: "Listeye ekle" }));

    await waitFor(() =>
      expect(addIskurInterns).toHaveBeenCalledWith("p1", [
        "yeni@example.test",
        "adres-degil",
      ]),
    );
    expect(
      await screen.findByText(
        "Şu girişler e-posta adresi olarak okunamadı ve eklenmedi: adres-degil",
      ),
    ).toBeInTheDocument();
    expect(box).toHaveValue("adres-degil");
    expect(
      await screen.findByText("Stajyer listesi güncellendi."),
    ).toBeInTheDocument();
  });

  it("removes an address but not one whose owner is placed", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(
      iskurInternList([{ ...ayse, placed: true }, yeni]),
    );
    vi.mocked(removeIskurIntern).mockResolvedValue(
      iskurInternList([{ ...ayse, placed: true }]),
    );
    await renderCard();

    const placed = screen.getByRole("button", {
      name: "ayse@example.test adresini listeden çıkar",
    });
    expect(placed).toBeDisabled();
    expect(placed).toHaveAccessibleDescription("Önce yerleşimden çıkar.");
    expect(screen.getByText("Ekibe yerleştirildi")).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", {
        name: "yeni@example.test adresini listeden çıkar",
      }),
    );

    await waitFor(() =>
      expect(removeIskurIntern).toHaveBeenCalledWith("p1", "e-yeni"),
    );
    await waitFor(() =>
      expect(screen.queryByText("yeni@example.test")).not.toBeInTheDocument(),
    );
  });

  it("shows the backend's refusal when removing fails", async () => {
    vi.mocked(removeIskurIntern).mockRejectedValue(
      new ClientApiError(PLACED_REFUSAL, 409),
    );
    await renderCard();

    await userEvent.click(
      screen.getByRole("button", {
        name: "yeni@example.test adresini listeden çıkar",
      }),
    );

    expect(await screen.findByText(PLACED_REFUSAL)).toBeInTheDocument();
  });

  it("refuses a paste over the limit and an empty one", async () => {
    await renderCard();
    const add = screen.getByRole("button", { name: "Listeye ekle" });
    expect(add).toBeDisabled();

    const many = Array.from(
      { length: ISKUR_INTERN_PASTE_MAX + 1 },
      (_, index) => `kisi${index}@example.test`,
    ).join("\n");
    fireEvent.change(screen.getByLabelText("Eklenecek e-posta adresleri"), {
      target: { value: many },
    });

    expect(
      screen.getByText(
        `Bir seferde en fazla ${ISKUR_INTERN_PASTE_MAX} adres eklenebilir.`,
      ),
    ).toBeInTheDocument();
    expect(add).toBeDisabled();
    expect(addIskurInterns).not.toHaveBeenCalled();
  });

  it("says so when the list is empty", async () => {
    vi.mocked(getIskurInterns).mockResolvedValue(iskurInternList([]));
    renderWithQueryClient(<IskurInternsCard programId="p1" />);

    expect(
      await screen.findByText("Listede henüz adres yok."),
    ).toBeInTheDocument();
  });

  it("says so when the list cannot be loaded", async () => {
    vi.mocked(getIskurInterns).mockRejectedValue(
      new ClientApiError("Stajyer listesi yüklenemedi.", 500),
    );
    renderWithQueryClient(<IskurInternsCard programId="p1" />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Stajyer listesi yüklenemedi.",
    );
  });
});
