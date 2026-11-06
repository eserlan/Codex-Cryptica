import { afterEach, describe, expect, it, vi } from "vitest";
import { getVaultSingleton } from "./singleton";
import type { VaultStore } from "../vault.svelte";
vi.mock("../debug.svelte", () => ({ debugStore: { log: vi.fn() } }));
const globals = globalThis as typeof globalThis & {
  __codex_vault_instance__?: VaultStore;
  __CODEX_PERFORMANCE_CAPTURE__?: boolean;
};
const initialVault = globals.__codex_vault_instance__;
afterEach(() => {
  if (initialVault) globals.__codex_vault_instance__ = initialVault;
  else delete globals.__codex_vault_instance__;
  delete globals.__CODEX_PERFORMANCE_CAPTURE__;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("getVaultSingleton", () => {
  it("creates a vault once and reuses its identity on subsequent module loads", () => {
    delete globals.__codex_vault_instance__;
    vi.stubEnv("DEV", false);
    const instance = {} as VaultStore;
    const create = vi.fn(() => instance);
    expect(getVaultSingleton(create)).toBe(instance);
    expect(getVaultSingleton(create)).toBe(instance);
    expect(create).toHaveBeenCalledOnce();
  });
  it.each(["development", "capture"])(
    "exposes the vault in the browser for %s",
    (mode) => {
      vi.stubGlobal("window", {});
      vi.stubEnv("DEV", mode === "development");
      globals.__CODEX_PERFORMANCE_CAPTURE__ = mode === "capture";
      const instance = getVaultSingleton(() => ({}) as VaultStore);
      expect((window as unknown as { vault: VaultStore }).vault).toBe(instance);
    },
  );
  it("supports server execution without a window", () => {
    vi.stubGlobal("window", undefined);
    expect(() => getVaultSingleton(() => ({}) as VaultStore)).not.toThrow();
  });
});
