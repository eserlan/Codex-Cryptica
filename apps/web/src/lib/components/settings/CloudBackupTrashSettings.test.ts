import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trash = vi.hoisted(() => ({
  items: [] as any[],
  loadState: "ready" as string,
  restoring: new Set<string>(),
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
  Object.assign(trash, { items: [], loadState: "ready", restoring: new Set() });
  trash.load.mockClear();
  trash.restore.mockClear();
});
afterEach(() => vi.useRealTimers());

describe("CloudBackupTrashSettings", () => {
  it("loads on mount and shows the empty state", () => {
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(trash.load).toHaveBeenCalledWith("v1");
    expect(screen.getByText("The trash is empty.")).toBeTruthy();
  });

  it("shows a row with who, how long ago and the days left", () => {
    trash.items = [item()];
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.getByText("Old Dock")).toBeTruthy();
    expect(
      screen.getByText(/Deleted by Mara, 2 days ago\. 28 days left\./),
    ).toBeTruthy();
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
    expect(screen.queryByRole("button", { name: "Restore" })).toBeNull();
    expect(
      screen.getByText("Can't be restored: the trash ran out of space"),
    ).toBeTruthy();
  });

  it("restores through the store, and disables the row while restoring", async () => {
    trash.items = [item()];
    const { unmount } = render(CloudBackupTrashSettings, { vaultId: "v1" });
    await fireEvent.click(screen.getByRole("button", { name: "Restore" }));
    expect(trash.restore).toHaveBeenCalledWith("v1", ["a"]);
    unmount();

    trash.restoring = new Set(["a"]);
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(
      (screen.getByRole("button", { name: "Restore" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });

  it("shows a failure with Refresh, which loads again", async () => {
    trash.loadState = "failed";
    render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(screen.getByText("Couldn't load the trash.")).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));
    expect(trash.load).toHaveBeenCalledTimes(2);
  });

  it("renders nothing when the worker does not support the trash", () => {
    trash.loadState = "unsupported";
    const { container } = render(CloudBackupTrashSettings, { vaultId: "v1" });
    expect(container.textContent?.trim()).toBe("");
  });
});
