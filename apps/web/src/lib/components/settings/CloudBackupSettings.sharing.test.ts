import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";

vi.mock("#lib/stores/cloud-backup.svelte.js", () => ({
  cloudBackupStore: {
    status: "off",
    consented: false,
    lastPushedAt: null,
    uploadProgress: null,
    autoState: "idle",
    knownBackups: [],
    skippedAssets: [],
    skippedEntities: [],
    errorMessage: null,
    recoveryKey: null,
    sharing: null,
    artworkConsentVersion: 0,
  },
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { activeVaultId: "v1" },
}));
vi.mock("#lib/stores/vault-registry.svelte.js", () => ({
  vaultRegistry: { availableVaults: [], listVaults: vi.fn() },
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { confirm: vi.fn(), success: vi.fn(), error: vi.fn() },
}));

import CloudBackupSettings from "./CloudBackupSettings.svelte";

describe("CloudBackupSettings sharing", () => {
  it("shows the sharing section with nothing switched on", () => {
    render(CloudBackupSettings);
    expect(screen.getByText("Share with group")).toBeTruthy();
  });

  it("shows no restore points while backup is off", () => {
    render(CloudBackupSettings);
    expect(screen.queryByText("Restore points")).toBeNull();
  });
});
