import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trash = vi.hoisted(() => ({
  items: [] as any[],
  usedBytes: null as number | null,
  maxBytes: null as number | null,
  loadedVaultId: "v1" as string | null,
  loadState: "ready" as string,
  restoring: new Set<string>(),
  result: null as any,
  resultVaultId: "v1" as string | null,
  load: vi.fn(async () => {}),
  restore: vi.fn(async () => 1),
}));
vi.mock("#lib/stores/cloud-backup.svelte.js", () => ({
  cloudBackupStore: { trash },
}));

import CloudBackupTrashSettings from "./CloudBackupTrashSettings.svelte";

const NOW = Date.UTC(2026, 8, 20, 12);
const DAY = 24 * 60 * 60 * 1000;
const item = (over: Record<string, unknown> = {}) => ({
  id: "a",
  title: "Old Dock",
  deletedBy: "Mara",
  deletedAt: new Date(NOW - 2 * DAY).toISOString(),
  restorable: true,
  ...over,
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  Object.assign(trash, {
    items: [],
    usedBytes: null,
    maxBytes: null,
    loadedVaultId: "v1",
    loadState: "ready",
    restoring: new Set(),
    result: null,
    resultVaultId: "v1",
  });
  trash.load.mockClear();
  trash.restore.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("CloudBackupTrashSettings", () => {
  it("loads on mount and shows the empty state", () => {
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(trash.load).toHaveBeenCalledWith("v1");
    expect(screen.getByText("The trash is empty.")).toBeTruthy();
    expect(screen.getByRole("status").getAttribute("aria-live")).toBe("polite");
  });

  it("shows a row with who, how long ago and the days left", () => {
    trash.items = [item()];
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.getByText("Old Dock")).toBeTruthy();
    expect(
      screen.getByText(/Deleted by Mara, 2 days ago\. 28 days left\./),
    ).toBeTruthy();
  });

  it("labels a map or canvas, and leaves an entity unlabelled", () => {
    trash.items = [
      item({ id: "m", title: "Atlas", kind: "map" }),
      item({ id: "c", title: "Plot", kind: "canvas" }),
      item({ id: "e", title: "Dock", kind: "entity" }),
    ];
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.getByText("Map")).toBeTruthy();
    expect(screen.getByText("Canvas")).toBeTruthy();
    expect(screen.queryByText("Entity")).toBeNull();
  });

  it("does not show trash rows loaded for another vault", () => {
    trash.items = [item()];
    render(CloudBackupTrashSettings, { vaultId: "v2" });
    expect(screen.queryByText("Old Dock")).toBeNull();
  });

  it("maps owner and member, and renders a name as plain text", () => {
    trash.items = [
      item({ id: "1", deletedBy: "owner" }),
      item({ id: "2", deletedBy: "member" }),
      item({ id: "3", deletedBy: "<b>Zed</b>", title: "" }),
    ];
    const { container } = render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.getByText(/Deleted by the owner/)).toBeTruthy();
    expect(screen.getByText(/Deleted by a group member/)).toBeTruthy();
    expect(screen.getByText(/Deleted by <b>Zed<\/b>/)).toBeTruthy();
    expect(screen.getByText("Untitled")).toBeTruthy();
    expect(container.querySelector("b")).toBeNull();
  });

  it("rounds days left up and never shows less than 0", () => {
    trash.items = [
      item({ id: "1", deletedAt: new Date(NOW - 29.5 * DAY).toISOString() }),
      item({ id: "2", deletedAt: new Date(NOW - 40 * DAY).toISOString() }),
    ];
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.getByText(/1 day left/)).toBeTruthy();
    expect(screen.getByText(/0 days left/)).toBeTruthy();
  });

  it("shows no button for an item that cannot be restored", () => {
    trash.items = [item({ restorable: false })];
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.queryByRole("button", { name: /^Restore/ })).toBeNull();
    expect(
      screen.getByText("Can't be restored. The trash ran out of space."),
    ).toBeTruthy();
  });

  it("restores through the store, and disables the row while restoring", async () => {
    trash.items = [item()];
    const { unmount } = render(CloudBackupTrashSettings, { vaultId: "v1" });
    await fireEvent.click(
      screen.getByRole("button", { name: "Restore Old Dock" }),
    );
    expect(trash.restore).toHaveBeenCalledWith("v1", ["a"]);
    unmount();

    trash.restoring = new Set(["a"]);
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(
      (
        screen.getByRole("button", {
          name: "Restore Old Dock",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
  });

  it("shows a failure with Refresh, which loads again", async () => {
    trash.loadState = "failed";
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(
      screen.getByText(/Couldn't load the trash\. Check your connection/),
    ).toBeTruthy();
    await fireEvent.click(
      screen.getByRole("button", { name: "Refresh the trash" }),
    );
    expect(trash.load).toHaveBeenCalledTimes(2);
  });

  it("renders nothing when the worker does not support the trash", () => {
    trash.loadState = "unsupported";
    const { container } = render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(container.textContent?.trim()).toBe("");
  });

  it("shows Restoring while a row restores", () => {
    trash.items = [item()];
    trash.restoring = new Set(["a"]);
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.getByText("Restoring…")).toBeTruthy();
  });

  it.each([
    ["restored", "Restored Old Dock"],
    ["gone", "Old Dock can no longer be restored."],
    ["failed", "Couldn't restore Old Dock. Try again."],
  ])("says what a %s restore did", (outcome, text) => {
    trash.items = [item()];
    trash.result = { outcome, title: "Old Dock" };
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.getByRole("status").textContent?.trim()).toBe(text);
  });

  it("qualifies retention copy, shows usage when available, and omits it when null", () => {
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(
      screen.getByText(/up to 30 days, subject to the 50 MB trash limit/i),
    ).toBeTruthy();
    expect(screen.queryByText(/Trash storage:/)).toBeNull();

    trash.usedBytes = 10 * 1024 * 1024;
    trash.maxBytes = 50 * 1024 * 1024;
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.getByText("Trash storage: 10 MB of 50 MB used")).toBeTruthy();
  });

  it("shows a warning notice when trash is near capacity or has evicted items", () => {
    trash.usedBytes = 40 * 1024 * 1024;
    trash.maxBytes = 50 * 1024 * 1024;
    const { unmount } = render(CloudBackupTrashSettings, { vaultId: "v1" });
    const warning = screen.getByText(/Shared trash is nearly full/i);
    expect(warning).toBeTruthy();
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain(warning.textContent);
    expect(
      warning.parentElement
        ?.querySelector('[aria-hidden="true"]')
        ?.classList.contains("text-theme-text"),
    ).toBe(true);
    unmount();

    trash.usedBytes = 1024;
    trash.items = [item({ restorable: false })];
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(
      screen.getByText(/Some older items lost their restorable content/i),
    ).toBeTruthy();
  });
});
