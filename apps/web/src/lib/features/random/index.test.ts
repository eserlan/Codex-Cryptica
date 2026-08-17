import { beforeEach, describe, expect, it, vi } from "vitest";

const { vault, load } = vi.hoisted(() => ({
  vault: { activeVaultId: "v1" as string | null },
  load: vi.fn(),
}));

vi.mock("$lib/stores/vault.svelte", () => ({ vault }));

vi.mock("$lib/stores/random-source-store.svelte", () => ({
  RandomSourceStore: class {
    load = load;
  },
}));

import { ensureRandomSourcesLoaded } from "./index";

describe("ensureRandomSourcesLoaded", () => {
  beforeEach(() => {
    load.mockReset().mockResolvedValue(undefined);
    vault.activeVaultId = "v1";
  });

  it("loads once per vault and again after a switch", async () => {
    await ensureRandomSourcesLoaded();
    await ensureRandomSourcesLoaded();
    expect(load).toHaveBeenCalledTimes(1);

    vault.activeVaultId = "v2";
    await ensureRandomSourcesLoaded();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("skips loading while no vault is open, without remembering that as loaded", async () => {
    vault.activeVaultId = null;
    await ensureRandomSourcesLoaded();
    expect(load).not.toHaveBeenCalled();

    vault.activeVaultId = "v3";
    await ensureRandomSourcesLoaded();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("absorbs a failed read instead of rejecting — every call site fires and walks away", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    load.mockRejectedValueOnce(new Error("vault handle is stale"));

    await expect(ensureRandomSourcesLoaded()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("retries on the next mount after a failed read rather than recording it as loaded", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    load.mockRejectedValueOnce(new Error("vault handle is stale"));

    await ensureRandomSourcesLoaded();
    await ensureRandomSourcesLoaded();

    expect(load).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
