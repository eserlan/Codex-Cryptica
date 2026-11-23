import { describe, it, expect, vi, beforeEach } from "vitest";
import { bootSystem } from "./core-boot";

const { preloadGraphCore, debugLog } = vi.hoisted(() => ({
  preloadGraphCore: vi.fn().mockResolvedValue(undefined),
  debugLog: vi.fn(),
}));

vi.mock("../../stores/debug.svelte", () => ({ debugStore: { log: debugLog } }));
vi.mock("../../config", () => ({ IS_STAGING: true }));
vi.mock("graph-engine", () => ({ preloadGraphCore }));
beforeEach(() => vi.clearAllMocks());

describe("bootSystem", () => {
  it("should initialize core stores and set isStaging", () => {
    const mockStores = {
      categories: { init: vi.fn() },
      timeline: { init: vi.fn() },
      graph: { init: vi.fn() },
      calendar: { init: vi.fn() },
      vault: { init: vi.fn().mockResolvedValue(undefined) },
      sessionModeStore: { isStaging: false },
    };

    const result = bootSystem(mockStores as any);

    expect(result).toBe(true);
    expect(mockStores.categories.init).toHaveBeenCalled();
    expect(mockStores.timeline.init).not.toHaveBeenCalled();
    expect(mockStores.graph.init).not.toHaveBeenCalled();
    expect(mockStores.calendar.init).not.toHaveBeenCalled();
    expect(mockStores.vault.init).toHaveBeenCalled();
    expect(mockStores.sessionModeStore.isStaging).toBe(true);
  });

  it("does not preload graph core during workspace boot", async () => {
    const mockStores = {
      categories: { init: vi.fn() },
      vault: { init: vi.fn().mockResolvedValue(undefined) },
      sessionModeStore: { isStaging: false },
    };
    bootSystem(mockStores as any);
    await Promise.resolve();
    expect(preloadGraphCore).not.toHaveBeenCalled();
  });

  it("does not preload graph core after vault initialization resolves", async () => {
    let finishVaultInitialization!: () => void;
    const vaultInitialization = new Promise<void>((resolve) => {
      finishVaultInitialization = resolve;
    });
    const mockStores = {
      categories: { init: vi.fn() },
      vault: {
        activeVaultId: undefined as string | undefined,
        init: vi.fn(() => vaultInitialization),
      },
      sessionModeStore: { isStaging: false },
    };

    bootSystem(mockStores as any);
    await Promise.resolve();
    expect(preloadGraphCore).not.toHaveBeenCalled();

    mockStores.vault.activeVaultId = "vault-after-hydration";
    finishVaultInitialization();
    await vi.waitFor(() => expect(preloadGraphCore).toHaveBeenCalledOnce());
  });

  it("starts graph preload in parallel when an active vault is already restored", async () => {
    const mockStores = {
      categories: { init: vi.fn() },
      vault: {
        activeVaultId: "vault-1",
        init: vi.fn().mockResolvedValue(undefined),
      },
      sessionModeStore: { isStaging: false },
    };
    bootSystem(mockStores as any);
    await vi.waitFor(() => expect(preloadGraphCore).toHaveBeenCalledOnce());
  });

  it("should handle vault initialization failure and record boot failure when unexpected", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const recordFailure = vi.fn();
    const mockStores = {
      categories: { init: vi.fn() },
      timeline: { init: vi.fn() },
      graph: { init: vi.fn() },
      calendar: { init: vi.fn() },
      vault: {
        init: vi.fn().mockRejectedValue(new Error("Vault fail")),
        bootDiagnostics: {
          status: "booting",
          recordFailure,
        },
      },
      sessionModeStore: { isStaging: false },
    };

    bootSystem(mockStores as any);

    // Wait for the microtask to finish (the .catch block)
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalledWith(
      "Vault initialization failed",
      expect.any(Error),
    );
    expect(recordFailure).toHaveBeenCalledWith("unexpected");
    consoleSpy.mockRestore();
  });
});
