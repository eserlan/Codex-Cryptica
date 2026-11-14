import { render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const store = vi.hoisted(() => ({
  status: "idle",
  role: "owner" as "owner" | "editor" | null,
  linkGone: false,
  syncStopped: false,
  keptLocal: false,
  consented: true,
  lastPushedAt: null,
  uploadProgress: null,
  autoState: "idle",
  knownBackups: [],
  skippedAssets: [],
  skippedEntities: [],
  errorMessage: null as string | null,
  recoveryKey: null,
  sharing: null,
  artworkConsentVersion: 0,
  mergeNotice: null,
}));

vi.mock("#lib/stores/cloud-backup.svelte.js", () => ({
  cloudBackupStore: store,
}));
vi.mock("#lib/stores/shared-vault-identity.js", () => ({
  sharedVaultIdentity: { displayName: () => "Zed" },
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { activeVaultId: "v1" },
}));
vi.mock("#lib/stores/vault-registry.svelte.js", () => ({
  vaultRegistry: { availableVaults: [], listVaults: vi.fn() },
}));
vi.mock("#lib/stores/ui/notification.svelte.js", () => ({
  notificationStore: { confirm: vi.fn(), notify: vi.fn() },
}));

import CloudBackupSettings from "./CloudBackupSettings.svelte";

beforeEach(() => {
  vi.stubEnv("VITE_SHARED_VAULT", "true");
  Object.assign(store, {
    role: "owner",
    linkGone: false,
    syncStopped: false,
    keptLocal: false,
    autoState: "idle",
    errorMessage: null,
  });
});
afterEach(() => vi.unstubAllEnvs());

describe("CloudBackupSettings for a member of a shared vault", () => {
  it("keeps every owner control for an owner", () => {
    render(CloudBackupSettings);
    for (const name of [
      "Save to cloud",
      "Copy recovery key",
      "Turn off",
      "Delete backup",
    ]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
    expect(screen.getAllByText("Share with group").length).toBeGreaterThan(0);
    expect(screen.queryByText(/You joined this shared vault/)).toBeNull();
  });

  it("hides the owner controls for an editor and says who they are", () => {
    store.role = "editor";
    render(CloudBackupSettings);
    for (const name of [
      "Save to cloud",
      "Copy recovery key",
      "Delete backup",
    ]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    expect(screen.queryAllByText("Share with group")).toEqual([]);
    expect(screen.getByRole("button", { name: "Turn off" })).toBeTruthy();
    expect(
      screen.getByText(
        "You joined this shared vault as Zed. The owner manages the link and the shared copy.",
      ),
    ).toBeTruthy();
  });

  it("never offers Keep my version to an editor", () => {
    store.role = "editor";
    store.autoState = "conflict";
    render(CloudBackupSettings);
    expect(
      screen.queryByRole("button", { name: "Keep my version" }),
    ).toBeNull();
  });

  it("shows the kept-local line as a status, not an error", () => {
    store.role = "editor";
    store.keptLocal = true;
    render(CloudBackupSettings);
    const line = screen.getByText(
      "Map, canvas and image changes stay on this device for now. Your other changes still sync.",
    );
    expect(line.getAttribute("role")).toBe("status");
    expect(screen.queryByText(/Sync failed/)).toBeNull();
  });

  it("shows a gone link as an alert", () => {
    store.role = "editor";
    store.linkGone = true;
    render(CloudBackupSettings);
    expect(screen.getByRole("alert").textContent).toContain(
      "This group link no longer works. Ask the owner for the new link.",
    );
  });

  it("shows the server's message when the device cap stops sync", () => {
    store.role = "editor";
    store.syncStopped = true;
    store.errorMessage =
      "This shared vault already has the most devices it allows.";
    render(CloudBackupSettings);
    expect(screen.getByRole("alert").textContent).toContain(
      "most devices it allows",
    );
  });
});
