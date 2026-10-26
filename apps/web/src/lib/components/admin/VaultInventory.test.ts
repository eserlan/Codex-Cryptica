import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import VaultInventory from "./VaultInventory.svelte";
import {
  VaultInventoryError,
  VaultInventoryService,
  type VaultInventoryKind,
  type VaultInventoryRow,
} from "#lib/services/admin/vault-inventory.js";

const row = (
  id: string,
  overrides: Partial<VaultInventoryRow> = {},
): VaultInventoryRow => ({
  id,
  title: `Vault ${id}`,
  sizeBytes: 1024 * 1024,
  entityCount: 10,
  createdAt: null,
  lastActiveAt: "2026-10-20T10:00:00.000Z",
  ...overrides,
});

function fakeService(
  data: Record<VaultInventoryKind, VaultInventoryRow[]> | Error,
) {
  const service = new VaultInventoryService(vi.fn(), "https://w.test");
  const fetchAll = vi
    .spyOn(service, "fetchAll")
    .mockImplementation(async (kind, _token, onPage) => {
      if (data instanceof Error) throw data;
      onPage?.(data[kind]);
      return data[kind];
    });
  return { service, fetchAll };
}

async function loadWith(service: VaultInventoryService) {
  render(VaultInventory, { props: { service } });
  await fireEvent.input(screen.getByLabelText("Admin token"), {
    target: { value: " secret " },
  });
  await fireEvent.click(screen.getByRole("button", { name: "Load" }));
}

const titles = () =>
  screen
    .getAllByTestId("inventory-row")
    .map((tr) => tr.querySelector(".font-bold")?.textContent);

describe("VaultInventory", () => {
  it("loads both inventories with the trimmed token, newest activity first", async () => {
    const { service, fetchAll } = fakeService({
      backups: [
        row("old", { lastActiveAt: "2026-01-01T00:00:00.000Z" }),
        row("new", { sizeBytes: 5 * 1024 * 1024, entityCount: 30 }),
      ],
      published: [row("pub", { suspension: "disable" })],
    });
    await loadWith(service);

    expect(fetchAll).toHaveBeenCalledWith(
      "backups",
      "secret",
      expect.any(Function),
    );
    expect(fetchAll).toHaveBeenCalledWith(
      "published",
      "secret",
      expect.any(Function),
    );
    expect(await screen.findAllByTestId("inventory-row")).toHaveLength(2);
    expect(titles()).toEqual(["Vault new", "Vault old"]);
    expect(screen.getByTestId("inventory-summary").textContent).toContain(
      "2 vaults · 6.00 MB · 40",
    );
  });

  it("re-sorts by a column and flips direction on a second click", async () => {
    const { service } = fakeService({
      backups: [row("a", { sizeBytes: 1 }), row("b", { sizeBytes: 9 })],
      published: [],
    });
    await loadWith(service);
    await screen.findAllByTestId("inventory-row");
    const size = screen.getByRole("button", { name: "Size" });
    await fireEvent.click(size);
    expect(titles()).toEqual(["Vault b", "Vault a"]);
    expect(size.closest("th")?.getAttribute("aria-sort")).toBe("descending");
    await fireEvent.click(size);
    expect(titles()).toEqual(["Vault a", "Vault b"]);
  });

  it("shows moderation status only on the published view", async () => {
    const { service } = fakeService({
      backups: [row("a")],
      published: [row("p", { suspension: "delist" })],
    });
    await loadWith(service);
    await screen.findAllByTestId("inventory-row");
    expect(screen.queryByText("Status")).toBeNull();
    await fireEvent.click(
      screen.getByRole("button", { name: "Published (1)" }),
    );
    expect(screen.getByText("Delisted")).toBeTruthy();
  });

  it("reports a rejected token without showing any rows", async () => {
    const { service } = fakeService(
      new VaultInventoryError("Not found — wrong token."),
    );
    await loadWith(service);
    expect(
      (await screen.findByTestId("inventory-error")).textContent,
    ).toContain("wrong token");
    expect(screen.queryAllByTestId("inventory-row")).toHaveLength(0);
  });

  it("does nothing without a token", async () => {
    const { service, fetchAll } = fakeService({ backups: [], published: [] });
    render(VaultInventory, { props: { service } });
    expect(
      (screen.getByRole("button", { name: "Load" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(fetchAll).not.toHaveBeenCalled();
  });
});
