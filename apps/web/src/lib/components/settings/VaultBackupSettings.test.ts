/** @vitest-environment jsdom */

import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VaultBackupSettings from "./VaultBackupSettings.svelte";

const mocks = vi.hoisted(() => ({
  exportVaultToZip: vi.fn(),
  parseVaultArchive: vi.fn(),
  notify: vi.fn(),
  createVault: vi.fn(),
  writeArchiveToVault: vi.fn(),
  switchVault: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({
  vault: {
    activeVaultId: "vault-1",
    vaultName: "Test Vault",
    switchVault: mocks.switchVault,
  },
}));
vi.mock("$lib/stores/vault-registry.svelte", () => ({
  vaultRegistry: { createVault: mocks.createVault },
}));
vi.mock("$lib/stores/ui/notification.svelte", () => ({
  notificationStore: { notify: mocks.notify },
}));
vi.mock("$lib/utils/vault-archive", () => ({
  exportVaultToZip: mocks.exportVaultToZip,
  parseVaultArchive: mocks.parseVaultArchive,
  writeArchiveToVault: mocks.writeArchiveToVault,
  VAULT_ARCHIVE_EXTENSION: ".zip",
}));

describe("VaultBackupSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an accessible busy export action until the export completes", async () => {
    let resolveExport!: (count: number) => void;
    mocks.exportVaultToZip.mockReturnValue(
      new Promise<number>((resolve) => (resolveExport = resolve)),
    );
    render(VaultBackupSettings);

    await fireEvent.click(
      screen.getByRole("button", { name: "Export Backup" }),
    );

    const exportButton = screen.getByRole("button", { name: "Preparing..." });
    expect(exportButton.getAttribute("type")).toBe("button");
    expect(exportButton.getAttribute("aria-busy")).toBe("true");
    expect((exportButton as HTMLButtonElement).disabled).toBe(true);
    expect(exportButton.querySelector(".animate-spin")).not.toBeNull();

    resolveExport(2);
    await waitFor(() => {
      expect(
        screen
          .getByRole("button", { name: "Export Backup" })
          .getAttribute("aria-busy"),
      ).toBe("false");
    });
  });

  it("restores the import action after archive parsing fails", async () => {
    mocks.parseVaultArchive.mockRejectedValue(new Error("Invalid archive"));
    render(VaultBackupSettings);
    const input = document.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    Object.defineProperty(input, "files", {
      value: [new File(["bad"], "bad.zip")],
    });

    await fireEvent.change(input);

    expect(
      screen
        .getByRole("button", { name: "Import Backup" })
        .getAttribute("aria-busy"),
    ).toBe("false");
    expect(mocks.notify).toHaveBeenCalledWith("Invalid archive", "error", true);
  });
});
