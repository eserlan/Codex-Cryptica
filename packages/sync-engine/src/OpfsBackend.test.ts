import { describe, expect, it, vi } from "vitest";
import { OpfsBackend } from "./OpfsBackend";

describe("OpfsBackend", () => {
  it("uses the monotonic performance clock by default", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const now = vi
      .spyOn(performance, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(112.34);
    const handle = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: true as const, value: undefined }),
      }),
    } as FileSystemDirectoryHandle;
    const registry = {
      getOpfsStatesByVault: vi.fn().mockResolvedValue([]),
      putOpfsStates: vi.fn(),
    } as unknown as ConstructorParameters<typeof OpfsBackend>[1];
    const backend = new OpfsBackend(handle, registry);

    await backend.scan("v1");

    expect(now).toHaveBeenCalledTimes(2);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("scan took 12.34ms for 0 files"),
    );
    now.mockRestore();
    log.mockRestore();
  });

  it("uses the injected clock for scan duration", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const times = [100, 112.34];
    const handle = {
      [Symbol.asyncIterator]: () => ({
        next: async () => ({ done: true as const, value: undefined }),
      }),
    } as FileSystemDirectoryHandle;
    const registry = {
      getOpfsStatesByVault: vi.fn().mockResolvedValue([]),
      putOpfsStates: vi.fn(),
    } as unknown as ConstructorParameters<typeof OpfsBackend>[1];
    const backend = new OpfsBackend(handle, registry, {
      now: () => times.shift() ?? 112.34,
    });

    await backend.scan("v1");

    expect(log).toHaveBeenCalledWith(
      expect.stringContaining("scan took 12.34ms for 0 files"),
    );
    log.mockRestore();
  });
});
