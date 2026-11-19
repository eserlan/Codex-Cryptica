import { describe, expect, it, vi } from "vitest";
import { createArtworkEntityLock } from "./artwork-entity-lock";

describe("canonical artwork lock", () => {
  it("uses an exclusive per-Vault entity lock", async () => {
    const request = vi.fn(
      async (
        _name: string,
        _options: LockOptions,
        action: () => Promise<string>,
      ) => action(),
    );
    const lock = createArtworkEntityLock({ request } as never);
    expect(await lock("adventure-artwork:v1:e1", async () => "saved")).toBe(
      "saved",
    );
    expect(request).toHaveBeenCalledWith(
      "adventure-artwork:v1:e1",
      { mode: "exclusive" },
      expect.any(Function),
    );
  });
  it("fails closed without browser lock support and does not write", async () => {
    const action = vi.fn();
    await expect(
      createArtworkEntityLock(undefined)("adventure-artwork:v1:e1", action),
    ).rejects.toThrow("unavailable");
    expect(action).not.toHaveBeenCalled();
  });
});
