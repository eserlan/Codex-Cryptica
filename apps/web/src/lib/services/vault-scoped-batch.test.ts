import { describe, expect, it, vi } from "vitest";
import { runVaultScopedBatch } from "./vault-scoped-batch";

describe("runVaultScopedBatch", () => {
  it("processes all items in order and reports progress", async () => {
    const seen: string[] = [];
    const progress: Array<[number, number]> = [];
    const result = await runVaultScopedBatch(
      ["a", "b", "c"],
      async (item, ctx) => {
        expect(ctx.vaultId).toBe("vault-1");
        expect(ctx.isActive()).toBe(true);
        seen.push(item);
      },
      {
        getVaultId: () => "vault-1",
        onProgress: (done, total) => progress.push([done, total]),
      },
    );

    expect(seen).toEqual(["a", "b", "c"]);
    expect(progress).toEqual([
      [1, 3],
      [2, 3],
      [3, 3],
    ]);
    expect(result).toEqual({
      processed: 3,
      total: 3,
      interrupted: false,
      cancelled: false,
    });
  });

  it("stops immediately and marks interrupted when the active Vault changes mid-batch", async () => {
    let activeVault: string | null = "vault-1";
    const committed: string[] = [];
    const unconfirmed: string[] = [];

    const result = await runVaultScopedBatch(
      ["first", "second", "third"],
      async (item, ctx) => {
        if (item === "second") {
          activeVault = "vault-2";
        }
        if (!ctx.isVaultCurrent()) {
          unconfirmed.push(item);
          return;
        }
        committed.push(item);
      },
      { getVaultId: () => activeVault },
    );

    expect(committed).toEqual(["first"]);
    expect(unconfirmed).toEqual(["second"]);
    expect(result).toEqual({
      processed: 1,
      total: 3,
      interrupted: true,
      cancelled: false,
    });
  });

  it("stops cleanly at item boundaries when AbortSignal fires", async () => {
    const controller = new AbortController();
    const seen: string[] = [];

    const result = await runVaultScopedBatch(
      ["one", "two", "three"],
      async (item) => {
        seen.push(item);
        if (item === "one") controller.abort();
      },
      {
        getVaultId: () => "vault-1",
        signal: controller.signal,
      },
    );

    expect(seen).toEqual(["one"]);
    expect(result).toEqual({
      processed: 1,
      total: 3,
      interrupted: false,
      cancelled: true,
    });
  });

  it("does not run any handler when already aborted before start", async () => {
    const controller = new AbortController();
    controller.abort();
    const handler = vi.fn(async () => {});

    const result = await runVaultScopedBatch(["one"], handler, {
      getVaultId: () => "vault-1",
      signal: controller.signal,
    });

    expect(handler).not.toHaveBeenCalled();
    expect(result).toEqual({
      processed: 0,
      total: 1,
      interrupted: false,
      cancelled: true,
    });
  });
});
