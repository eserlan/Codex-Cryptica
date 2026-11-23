/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DriveSettings from "./DriveSettings.svelte";

const mocks = vi.hoisted(() => ({
  connectVaultToDrive: vi.fn(),
  disconnectVaultFromDrive: vi.fn(),
  pushVaultToDrive: vi.fn(),
  pullVaultToDrive: vi.fn(),
  listDriveVaults: vi.fn(),
  importVaultFromDrive: vi.fn(),
  loadGDriveSync: vi.fn(),
  getMetadata: vi.fn(),
  notify: vi.fn(),
  confirm: vi.fn(),
  vault: { activeVaultId: "vault-1" as string | null },
}));

vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: mocks.vault,
}));
vi.mock("#lib/stores/drive.svelte.js", () => ({ driveStore: {} }));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { notify: mocks.notify, confirm: mocks.confirm },
}));
vi.mock("#lib/utils/idb.js", () => ({ getDB: vi.fn().mockResolvedValue({}) }));
vi.mock("#lib/services/gdrive-sync-loader.js", () => ({
  loadGDriveSync: mocks.loadGDriveSync,
}));
vi.mock("@codex/sync-engine", () => ({
  SyncRegistry: class {},
  CloudSyncMetadataService: class {
    getMetadata = mocks.getMetadata;
  },
}));

describe("DriveSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.vault.activeVaultId = "vault-1";
    mocks.loadGDriveSync.mockResolvedValue({
      connectVaultToDrive: mocks.connectVaultToDrive,
      disconnectVaultFromDrive: mocks.disconnectVaultFromDrive,
      pushVaultToDrive: mocks.pushVaultToDrive,
      pullVaultFromDrive: mocks.pullVaultToDrive,
      listDriveVaults: mocks.listDriveVaults,
      importVaultFromDrive: mocks.importVaultFromDrive,
    });
    mocks.getMetadata.mockResolvedValue({
      remoteFolderId: "folder-1",
      lastSyncTime: null,
    });
  });

  it("shows a disabled, busy save action while a push is pending", async () => {
    let resolvePush!: () => void;
    mocks.pushVaultToDrive.mockReturnValue(
      new Promise<void>((resolve) => (resolvePush = resolve)),
    );
    render(DriveSettings);
    await waitFor(() => screen.getByRole("button", { name: "Save to Drive" }));
    expect(mocks.loadGDriveSync).not.toHaveBeenCalled();

    await fireEvent.click(
      screen.getByRole("button", { name: "Save to Drive" }),
    );
    expect(mocks.loadGDriveSync).toHaveBeenCalledTimes(1);

    const saveButton = screen.getByRole("button", { name: "Saving..." });
    expect(saveButton.getAttribute("type")).toBe("button");
    expect(saveButton.getAttribute("aria-busy")).toBe("true");
    expect((saveButton as HTMLButtonElement).disabled).toBe(true);
    expect(saveButton.querySelector(".animate-spin")).not.toBeNull();

    resolvePush();
    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Save to Drive" })
          .getAttribute("aria-busy"),
      ).toBe("false");
    });
  });

  it("restores the load action after a failed pull", async () => {
    mocks.confirm.mockResolvedValue(true);
    mocks.pullVaultToDrive.mockRejectedValue(new Error("Drive unavailable"));
    render(DriveSettings);
    await waitFor(() =>
      screen.getByRole("button", { name: "Load from Drive" }),
    );

    await fireEvent.click(
      screen.getByRole("button", { name: "Load from Drive" }),
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Load from Drive" })
          .getAttribute("aria-busy"),
      ).toBe("false");
    });
    expect(mocks.notify).toHaveBeenCalledWith("Drive unavailable", "error");
  });

  it("keeps Drive actions available to retry after the lazy chunk fails", async () => {
    mocks.loadGDriveSync.mockRejectedValueOnce(
      new Error("Drive chunk unavailable"),
    );
    render(DriveSettings);
    await waitFor(() => screen.getByRole("button", { name: "Save to Drive" }));

    await fireEvent.click(
      screen.getByRole("button", { name: "Save to Drive" }),
    );

    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Save to Drive" })
          .getAttribute("aria-busy"),
      ).toBe("false");
    });
    expect(mocks.notify).toHaveBeenCalledWith(
      "Drive chunk unavailable",
      "error",
    );
    expect((await screen.findByRole("alert")).textContent).toContain(
      "Reload this page to try again",
    );
    expect(screen.getByRole("button", { name: "Reload page" })).toBeTruthy();

    await fireEvent.click(
      screen.getByRole("button", { name: "Save to Drive" }),
    );
    expect(mocks.pushVaultToDrive).toHaveBeenCalledTimes(1);
  });

  it("does not push to a newly active vault when the Drive chunk resolves late", async () => {
    let resolveLoader!: (value: Record<string, unknown>) => void;
    mocks.loadGDriveSync.mockReturnValue(
      new Promise((resolve) => (resolveLoader = resolve)),
    );
    render(DriveSettings);
    await waitFor(() => screen.getByRole("button", { name: "Save to Drive" }));

    await fireEvent.click(
      screen.getByRole("button", { name: "Save to Drive" }),
    );
    mocks.vault.activeVaultId = "vault-2";
    resolveLoader({ pushVaultToDrive: mocks.pushVaultToDrive });

    await waitFor(() => screen.getByRole("button", { name: "Save to Drive" }));
    expect(mocks.pushVaultToDrive).not.toHaveBeenCalled();
  });

  it("does not pull into a new vault after overwrite confirmation and lazy loading", async () => {
    let resolveLoader!: (value: Record<string, unknown>) => void;
    mocks.confirm.mockResolvedValue(true);
    mocks.loadGDriveSync.mockReturnValue(
      new Promise((resolve) => (resolveLoader = resolve)),
    );
    render(DriveSettings);
    await waitFor(() =>
      screen.getByRole("button", { name: "Load from Drive" }),
    );

    await fireEvent.click(
      screen.getByRole("button", { name: "Load from Drive" }),
    );
    mocks.vault.activeVaultId = "vault-2";
    resolveLoader({ pullVaultFromDrive: mocks.pullVaultToDrive });

    await waitFor(() =>
      screen.getByRole("button", { name: "Load from Drive" }),
    );
    expect(mocks.pullVaultToDrive).not.toHaveBeenCalled();
  });
});
