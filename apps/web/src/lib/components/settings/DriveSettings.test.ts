/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DriveSettings from "./DriveSettings.svelte";

const mocks = vi.hoisted(() => ({
  pushVaultToDrive: vi.fn(),
  pullVaultToDrive: vi.fn(),
  getMetadata: vi.fn(),
  notify: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({ vault: { activeVaultId: "vault-1" } }));
vi.mock("$lib/stores/drive.svelte", () => ({ driveStore: {} }));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: mocks.notify, confirm: mocks.confirm },
}));
vi.mock("$lib/utils/idb", () => ({ getDB: vi.fn().mockResolvedValue({}) }));
vi.mock("@codex/gdrive-sync", () => ({
  connectVaultToDrive: vi.fn(), disconnectVaultFromDrive: vi.fn(),
  pushVaultToDrive: mocks.pushVaultToDrive, pullVaultFromDrive: mocks.pullVaultToDrive,
  listDriveVaults: vi.fn(), importVaultFromDrive: vi.fn(),
}));
vi.mock("@codex/sync-engine", () => ({
  SyncRegistry: class {},
  CloudSyncMetadataService: class { getMetadata = mocks.getMetadata; },
}));

describe("DriveSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMetadata.mockResolvedValue({ remoteFolderId: "folder-1", lastSyncTime: null });
  });

  it("shows a disabled, busy save action while a push is pending", async () => {
    let resolvePush!: () => void;
    mocks.pushVaultToDrive.mockReturnValue(new Promise<void>((resolve) => (resolvePush = resolve)));
    render(DriveSettings);
    await waitFor(() => screen.getByRole("button", { name: "Save to Drive" }));

    await fireEvent.click(screen.getByRole("button", { name: "Save to Drive" }));

    const saveButton = screen.getByRole("button", { name: "Saving..." });
    expect(saveButton.getAttribute("type")).toBe("button");
    expect(saveButton.getAttribute("aria-busy")).toBe("true");
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    expect(saveButton.querySelector(".animate-spin")).not.toBeNull();

    resolvePush();
    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save to Drive" }).getAttribute("aria-busy"),
      ).toBe("false");
    });
  });

  it("restores the load action after a failed pull", async () => {
    mocks.confirm.mockResolvedValue(true);
    mocks.pullVaultToDrive.mockRejectedValue(new Error("Drive unavailable"));
    render(DriveSettings);
    await waitFor(() => screen.getByRole("button", { name: "Load from Drive" }));

    await fireEvent.click(screen.getByRole("button", { name: "Load from Drive" }));

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Load from Drive" }).getAttribute("aria-busy"),
      ).toBe("false");
    });
    expect(mocks.notify).toHaveBeenCalledWith("Drive unavailable", "error");
  });
});
