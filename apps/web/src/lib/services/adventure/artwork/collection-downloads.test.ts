import { describe, expect, it, vi } from "vitest";
import { downloadCollection } from "./collection-downloads";
import type { CollectionVariant } from "@codex/adventure-artwork-engine";

const variant = (id: string): CollectionVariant => ({
  url: `https://assets.codexcryptica.com/adventure-artwork/${id}.webp`,
  mime: "image/webp",
  width: 10,
  height: 10,
  bytes: 10,
  sha256: "a".repeat(64),
});
const first = variant("first");
const second = variant("second");
const third = variant("third");

describe("collection download", () => {
  it("downloads missing files with at most two operations and installs only after verifying all", async () => {
    const cached = new Set([first.url]);
    let active = 0;
    let peak = 0;
    const install = vi.fn(async () => true);
    const progress = vi.fn();
    const result = await downloadCollection(
      [first, second, third],
      new AbortController().signal,
      {
        hasValidated: async (v) => cached.has(v.url),
        preflight: async () => true,
        load: async (v) => {
          active++;
          peak = Math.max(peak, active);
          await Promise.resolve();
          cached.add(v.url);
          active--;
          return true;
        },
        install,
        progress,
      },
    );
    expect(result).toEqual({ status: "installed", completed: 3, total: 3 });
    expect(peak).toBe(2);
    expect(install).toHaveBeenCalledOnce();
    expect(progress).toHaveBeenLastCalledWith(3, 3);
  });
  it("retains completed files and does not install after cancellation or failed persistence", async () => {
    const cached = new Set<string>();
    const abort = new AbortController();
    const install = vi.fn(async () => true);
    const deps = {
      hasValidated: async (v: CollectionVariant) => cached.has(v.url),
      preflight: async () => true,
      load: async (v: CollectionVariant) => {
        cached.add(v.url);
        abort.abort();
        return true;
      },
      install,
    };
    expect((await downloadCollection([first], abort.signal, deps)).status).toBe(
      "cancelled",
    );
    expect(cached.has(first.url)).toBe(true);
    expect(install).not.toHaveBeenCalled();
    const retryLoad = vi.fn(async () => true);
    const retry = await downloadCollection(
      [first],
      new AbortController().signal,
      { ...deps, load: retryLoad },
    );
    expect(retry.status).toBe("installed");
    expect(retryLoad).not.toHaveBeenCalled();
    install.mockClear();
    expect(
      (
        await downloadCollection([second], new AbortController().signal, {
          ...deps,
          load: async () => true,
        })
      ).status,
    ).toBe("incomplete");
    expect(install).not.toHaveBeenCalled();
  });
  it("does not download when preflight rejects capacity or storage is unavailable", async () => {
    const load = vi.fn();
    const deps = {
      hasValidated: async () => false,
      preflight: async () => false,
      load,
      install: async () => true,
    };
    expect(
      (await downloadCollection([first], new AbortController().signal, deps))
        .status,
    ).toBe("capacity");
    expect(load).not.toHaveBeenCalled();
    expect(
      (
        await downloadCollection([first], new AbortController().signal, {
          ...deps,
          hasValidated: async () => {
            throw new Error("storage");
          },
        })
      ).status,
    ).toBe("unavailable");
  });
});
