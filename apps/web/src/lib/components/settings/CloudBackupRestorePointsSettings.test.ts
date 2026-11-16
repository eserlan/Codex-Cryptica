import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rollback = vi.hoisted(() => ({
  points: [] as Array<{ date: string; revision: number; entityCount: number }>,
  loadState: "ready" as string,
  loadedVaultId: "v1" as string | null,
  busyDate: null as string | null,
  result: null as {
    outcome: string;
    date: string;
    trashEvicted?: {
      evictedCount: number;
      usedBytes: number;
      maxBytes: number;
    };
  } | null,
  resultVaultId: "v1" as string | null,
  load: vi.fn(async () => {}),
  preview: vi.fn(),
  rollBack: vi.fn(async () => {}),
}));
vi.mock("#lib/stores/cloud-backup.svelte.js", () => ({
  cloudBackupStore: { rollback },
}));

import CloudBackupRestorePointsSettings from "./CloudBackupRestorePointsSettings.svelte";

const confirm = vi.fn();

function show() {
  render(CloudBackupRestorePointsSettings, { vaultId: "v1", confirm });
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(rollback, {
    points: [{ date: "2026-11-01", revision: 4, entityCount: 9 }],
    loadState: "ready",
    loadedVaultId: "v1",
    busyDate: null,
    result: null,
    resultVaultId: "v1",
  });
});

describe("CloudBackupRestorePointsSettings", () => {
  it("lists the points with their entity count", () => {
    show();
    expect(screen.getByText("9 entities")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Roll back to this day" }),
    ).toBeTruthy();
  });

  it("confirms with the three counts, then rolls back at the previewed revision", async () => {
    rollback.preview.mockResolvedValue({
      revision: 7,
      changed: 3,
      returning: 1,
      trashed: 2,
    });
    confirm.mockResolvedValue(true);
    show();
    await fireEvent.click(
      screen.getByRole("button", { name: "Roll back to this day" }),
    );
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    const options = confirm.mock.calls[0][0];
    expect(options.message).toContain(
      "3 items will change, 1 will come back from the trash and 2 will go to the trash.",
    );
    expect(options).toMatchObject({
      confirmLabel: "Roll back",
      isDangerous: true,
    });
    expect(options.title).toMatch(/^Roll back to .*2026.*\?$/);
    await waitFor(() =>
      expect(rollback.rollBack).toHaveBeenCalledWith("v1", "2026-11-01", 7),
    );
  });

  it("sends no commit when the owner cancels", async () => {
    rollback.preview.mockResolvedValue({
      revision: 7,
      changed: 1,
      returning: 0,
      trashed: 0,
    });
    confirm.mockResolvedValue(false);
    show();
    await fireEvent.click(
      screen.getByRole("button", { name: "Roll back to this day" }),
    );
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    expect(rollback.rollBack).not.toHaveBeenCalled();
  });

  it("skips the confirmation when nothing would change", async () => {
    rollback.preview.mockImplementation(async () => {
      rollback.result = { outcome: "matches", date: "2026-11-01" };
      return null;
    });
    show();
    await fireEvent.click(
      screen.getByRole("button", { name: "Roll back to this day" }),
    );
    await waitFor(() => expect(rollback.preview).toHaveBeenCalled());
    expect(confirm).not.toHaveBeenCalled();
    expect(rollback.rollBack).not.toHaveBeenCalled();
  });

  it("shows the success and matching messages as a status", () => {
    rollback.result = { outcome: "rolledBack", date: "2026-11-01" };
    show();
    expect(screen.getByRole("status").textContent).toMatch(
      /^Rolled back to .*2026\.$/,
    );
  });

  it("shows the matching message", () => {
    rollback.result = { outcome: "matches", date: "2026-11-01" };
    show();
    expect(screen.getByRole("status").textContent).toBe(
      "This vault already matches that day.",
    );
  });

  it.each([
    [
      "changed",
      "The vault changed since you checked. Press Roll back again to see the new numbers.",
    ],
    ["gone", "That restore point no longer exists."],
    ["failed", "Couldn't roll back. Nothing was changed. Try again later."],
  ])("shows %s as an alert", (outcome, text) => {
    rollback.result = { outcome, date: "2026-11-01" };
    show();
    expect(screen.getByRole("alert").textContent).toBe(text);
  });

  it("explains a failed list and an empty list", () => {
    rollback.loadState = "failed";
    show();
    expect(screen.getByRole("alert").textContent).toContain(
      "Couldn't load restore points. Check your connection and press Refresh.",
    );
  });

  it("explains an empty list", () => {
    rollback.points = [];
    show();
    expect(
      screen.getByText(/No restore points yet\. One is kept for each day/),
    ).toBeTruthy();
  });

  it("hides the section when the worker does not support it", () => {
    rollback.loadState = "unsupported";
    show();
    expect(screen.queryByText("Restore points")).toBeNull();
  });

  it("qualifies retention copy and warns before and after rollback eviction", async () => {
    rollback.preview.mockResolvedValueOnce({
      revision: 4,
      changed: 1,
      returning: 0,
      trashed: 3,
      trashEvicted: {
        evictedCount: 2,
        usedBytes: 49 * 1024 * 1024,
        maxBytes: 50 * 1024 * 1024,
      },
    });
    confirm.mockResolvedValueOnce(false);
    show();
    await fireEvent.click(
      screen.getByRole("button", { name: "Roll back to this day" }),
    );
    await waitFor(() => expect(confirm).toHaveBeenCalled());
    const msg = confirm.mock.calls[0][0].message as string;
    expect(msg).toContain("up to 30 days, subject to the 50 MB trash limit");
    expect(msg).toContain("2 older trash items");

    rollback.result = {
      outcome: "rolledBack",
      date: "2026-11-01",
      trashEvicted: {
        evictedCount: 2,
        usedBytes: 49 * 1024 * 1024,
        maxBytes: 50 * 1024 * 1024,
      },
    };
    show();
    const warning = screen.getByText(
      /Shared trash reached its 50 MB limit\. 2 older deleted items/,
    );
    expect(warning).toBeTruthy();
    expect(
      warning.parentElement
        ?.querySelector('[aria-hidden="true"]')
        ?.classList.contains("text-theme-text"),
    ).toBe(true);
  });
});
