import { expect, it, vi } from "vitest";
import { createArtworkCacheLock } from "./browser-cache-lock";
it("requires cross-tab locking rather than silently writing without exclusion", async () => {
  await expect(
    createArtworkCacheLock(undefined)(async () => 1),
  ).rejects.toThrow("artwork-cache-lock-unavailable");
  const request = vi.fn(async (_name, _options, callback) => callback());
  expect(
    await createArtworkCacheLock({ request } as unknown as LockManager)(
      async () => 7,
    ),
  ).toBe(7);
  expect(request).toHaveBeenCalledWith(
    "codex-adventure-artwork-cache-v1",
    { mode: "exclusive" },
    expect.any(Function),
  );
});
