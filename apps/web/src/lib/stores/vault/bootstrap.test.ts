import { beforeEach, describe, expect, it, vi } from "vitest";
import { VaultBootstrap } from "./bootstrap";
import { vaultRegistry } from "../vault-registry.svelte";
import { themeStore } from "../theme.svelte";
import { sessionModeStore } from "../ui/session-mode.svelte";
import { getDB } from "../../utils/idb";
import { migrateStructure } from "./migration";
import { statSheetTemplates } from "../stat-sheet-templates.svelte";
import { presentationTemplates } from "../presentation-templates.svelte";
import { entityTemplateStore } from "../entity-templates/entity-template-store.svelte";

vi.mock("$app/paths", () => ({ asset: (p: string) => `/${p}` }));
vi.mock("../vault-registry.svelte", () => ({
  vaultRegistry: { init: vi.fn(), rootHandle: {} },
}));
vi.mock("../theme.svelte", () => ({ themeStore: { loadForVault: vi.fn() } }));
vi.mock("../debug.svelte", () => ({ debugStore: { error: vi.fn() } }));
vi.mock("../ui/session-mode.svelte", () => ({
  sessionModeStore: { isGuestMode: false, isDemoMode: false },
}));
vi.mock("../../utils/idb", () => ({ getDB: vi.fn() }));
vi.mock("./migration", () => ({ migrateStructure: vi.fn() }));
vi.mock("../stat-sheet-templates.svelte", () => ({
  statSheetTemplates: { loadForVault: vi.fn() },
}));
vi.mock("../presentation-templates.svelte", () => ({
  presentationTemplates: { loadForVault: vi.fn() },
}));
vi.mock("../entity-templates/entity-template-store.svelte", () => ({
  entityTemplateStore: { clearForGuest: vi.fn() },
}));

function setup() {
  const vault = {
    isInitialized: false,
    defaultVisibility: "visible" as "visible" | "hidden",
    migrationRequired: false,
    activeVaultId: "vault" as string | null,
    loadFiles: vi.fn(),
    status: "loading" as "idle" | "loading",
    errorMessage: null as string | null,
    loadDemoData: vi.fn(),
  };
  const lifecycle = { runMigration: vi.fn(), loadEntityTemplates: vi.fn() };
  return { vault, lifecycle, bootstrap: new VaultBootstrap(vault, lifecycle) };
}

beforeEach(() => {
  vi.resetAllMocks();
  sessionModeStore.isGuestMode = false;
  sessionModeStore.isDemoMode = false;
  vi.mocked(getDB).mockResolvedValue({
    get: vi.fn().mockResolvedValue("hidden"),
  } as unknown as Awaited<ReturnType<typeof getDB>>);
});
describe("VaultBootstrap", () => {
  it("loads preferences and migration, then theme before parallel vault content", async () => {
    const { vault, lifecycle, bootstrap } = setup();
    lifecycle.runMigration.mockResolvedValue(true);
    let releaseTheme!: () => void;
    vi.mocked(themeStore.loadForVault).mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          releaseTheme = resolve;
        }),
    );
    const initializing = bootstrap.init();
    await vi.waitFor(() =>
      expect(themeStore.loadForVault).toHaveBeenCalledWith("vault"),
    );
    expect(vault.loadFiles).not.toHaveBeenCalled();
    releaseTheme();
    await initializing;
    expect(vault.defaultVisibility).toBe("hidden");
    expect(vault.migrationRequired).toBe(true);
    expect(migrateStructure).toHaveBeenCalledWith(vaultRegistry.rootHandle);
    expect(statSheetTemplates.loadForVault).toHaveBeenCalledWith("vault");
    expect(presentationTemplates.loadForVault).toHaveBeenCalledWith("vault");
    expect(lifecycle.loadEntityTemplates).toHaveBeenCalledWith("vault");
    expect(vault.loadFiles).toHaveBeenCalledOnce();
    expect(vault.isInitialized).toBe(true);
  });

  it("preserves preloaded guest data and stops after preferences in demo mode", async () => {
    const { vault, bootstrap } = setup();
    sessionModeStore.isGuestMode = true;
    await bootstrap.init();
    expect(vaultRegistry.init).not.toHaveBeenCalled();
    expect(vault.isInitialized).toBe(true);
    sessionModeStore.isGuestMode = false;
    sessionModeStore.isDemoMode = true;
    await bootstrap.init();
    expect(vault.defaultVisibility).toBe("hidden");
    expect(migrateStructure).not.toHaveBeenCalled();
    expect(vault.loadFiles).not.toHaveBeenCalled();
  });

  it("does not load content or dispatch a switch without an active vault", async () => {
    const { vault, bootstrap } = setup();
    vault.activeVaultId = null;
    const dispatch = vi.spyOn(window, "dispatchEvent");
    await bootstrap.init();
    expect(vault.loadFiles).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
    dispatch.mockRestore();
  });

  it.each(["ok", "http-error", "network-error"])(
    "finishes guest fallback after quota failure, including %s",
    async (response) => {
      const { vault, bootstrap } = setup();
      vi.mocked(vaultRegistry.init).mockRejectedValueOnce(
        new DOMException("full", "QuotaExceededError"),
      );
      const fetcher = vi.spyOn(globalThis, "fetch");
      if (response === "network-error")
        fetcher.mockRejectedValueOnce(new Error("network"));
      else
        fetcher.mockResolvedValueOnce({
          ok: response === "ok",
          json: async () => ({ entities: {} }),
        } as Response);
      await bootstrap.init();
      expect(entityTemplateStore.clearForGuest).toHaveBeenCalledOnce();
      expect(sessionModeStore.isGuestMode).toBe(true);
      expect(vault.isInitialized).toBe(true);
      expect(vault.status).toBe("idle");
      expect(vault.errorMessage).toContain("Storage full");
      if (response === "ok")
        expect(vault.loadDemoData).toHaveBeenCalledWith("Welcome", {});
      else expect(vault.loadDemoData).not.toHaveBeenCalled();
      fetcher.mockRestore();
    },
  );
});
