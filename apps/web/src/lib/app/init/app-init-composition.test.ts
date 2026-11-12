import { beforeEach, describe, expect, it, vi } from "vitest";
import * as api from "./app-init";
import { bootSystem } from "./core-boot";
import { setupWindowGlobals } from "./window-globals";
import { registerServiceWorker, collectVaultShellUrls } from "./service-worker";

const mocks = vi.hoisted(() => {
  const calls: string[] = [];
  const register = (name: string) =>
    vi.fn(() => {
      calls.push(name);
      return () => {
        calls.push(`-${name}`);
      };
    });
  return {
    calls,
    browser: true,
    flushPendingSaves: vi.fn(),
    persistent: vi.fn(() => {
      calls.push("persistent");
    }),
    oracle: register("oracle"),
    journal: register("journal"),
    errors: register("errors"),
    vault: register("vault"),
    backup: register("backup"),
    changes: register("changes"),
    flush: register("flush"),
  };
});
vi.mock("$app/env", () => ({
  get browser() {
    return mocks.browser;
  },
}));
vi.mock("../event-registrations", () => ({}));
vi.mock("#lib/utils/persistent-storage.js", () => ({
  requestPersistentStorage: mocks.persistent,
}));
vi.mock("../../listeners/oracle-events", () => ({
  initOracleEventListeners: mocks.oracle,
}));
vi.mock("../../listeners/session-journal-events", () => ({
  initSessionJournalCapture: mocks.journal,
}));
vi.mock("./global-errors", () => ({
  registerGlobalErrorListeners: mocks.errors,
}));
vi.mock("./vault-switch", () => ({ registerVaultSwitchListener: mocks.vault }));
vi.mock("./cloud-backup-lifecycle", () => ({
  initializeCloudBackup: mocks.backup,
  registerCloudBackupChanges: mocks.changes,
}));
vi.mock("./flush-saves-on-hide", () => ({
  registerFlushSavesOnHide: mocks.flush,
}));
vi.mock("#lib/stores/vault.svelte.js", () => ({
  vault: { flushPendingSaves: mocks.flushPendingSaves },
}));
vi.mock("./core-boot", () => ({ bootSystem: vi.fn() }));
vi.mock("./window-globals", () => ({ setupWindowGlobals: vi.fn() }));
vi.mock("./service-worker", () => ({
  registerServiceWorker: vi.fn(),
  collectVaultShellUrls: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.browser = true;
});

describe("app initialization composition", () => {
  it("retains the original public exports", () => {
    expect(api.bootSystem).toBe(bootSystem);
    expect(api.setupWindowGlobals).toBe(setupWindowGlobals);
    expect(api.registerServiceWorker).toBe(registerServiceWorker);
    expect(api.collectVaultShellUrls).toBe(collectVaultShellUrls);
  });

  it("preserves setup and cleanup order across the extracted responsibilities", () => {
    const cleanup = api.initializeGlobalListeners();
    expect(mocks.calls).toEqual([
      "persistent",
      "oracle",
      "journal",
      "errors",
      "vault",
      "backup",
      "flush",
      "changes",
    ]);
    cleanup();
    expect(mocks.calls.slice(8)).toEqual([
      "-oracle",
      "-journal",
      "-flush",
      "-changes",
      "-backup",
      "-errors",
      "-vault",
    ]);
  });

  it("forwards save flushes to the current vault", async () => {
    api.initializeGlobalListeners();
    // The registration mock captures the production adapter passed by the facade.
    const options = (
      mocks.flush.mock.calls as unknown as [
        { flushPendingSaves: () => Promise<void> },
      ][]
    )[0][0];
    await options.flushPendingSaves();
    expect(mocks.flushPendingSaves).toHaveBeenCalledOnce();
  });

  it("stays inert outside the browser and returns a safe cleanup", () => {
    mocks.browser = false;
    expect(() => api.initializeGlobalListeners()()).not.toThrow();
    expect(mocks.calls).toEqual([]);
  });
});
