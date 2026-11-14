import { render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";

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

describe("CloudBackupSettings sharing gate", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("shows no sharing text with the flag off", () => {
    vi.stubEnv("VITE_SHARED_VAULT", "");
    render(CloudBackupSettings);
    expect(screen.queryByText(/Share with group/)).toBeNull();
  });

  it("shows the sharing section with the flag on", () => {
    vi.stubEnv("VITE_SHARED_VAULT", "true");
    render(CloudBackupSettings);
    expect(screen.getByText("Share with group")).toBeTruthy();
  });
});
