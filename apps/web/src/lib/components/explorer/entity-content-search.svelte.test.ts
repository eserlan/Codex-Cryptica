import { afterEach, describe, expect, it, vi } from "vitest";
import { tick } from "svelte";
import type { SearchIndexProgress } from "@codex/search-engine";
import { EntityContentSearch } from "./entity-content-search.svelte.js";

const disposers: (() => void)[] = [];
afterEach(() => disposers.splice(0).forEach((dispose) => dispose()));

function setup(status: SearchIndexProgress["status"] = "ready") {
  let query = $state("dragon");
  let progress = { status, isPartial: false } as SearchIndexProgress;
  let listener: (value: SearchIndexProgress) => void = () => {};
  const unsubscribe = vi.fn();
  const service = {
    search: vi.fn().mockResolvedValue([{ id: "dragon" }]),
    getIndexProgress: () => progress,
    subscribeIndexProgress: vi.fn((callback: typeof listener) => {
      listener = callback;
      return unsubscribe;
    }),
  };
  const search = new EntityContentSearch(() => service);
  disposers.push(
    $effect.root(() =>
      search.connect(
        () => query,
        () => 4,
      ),
    ),
  );
  return {
    search,
    service,
    unsubscribe,
    setQuery: (value: string) => {
      query = value;
    },
    progress: (value: Partial<SearchIndexProgress>) => {
      progress = { ...progress, ...value };
      listener(progress);
    },
  };
}

describe("EntityContentSearch", () => {
  it("searches indexed text and reports matching ids", async () => {
    const { search, service } = setup();
    await tick();
    await vi.waitFor(() =>
      expect(search.textMatchIds).toEqual(new Set(["dragon"])),
    );
    expect(service.search).toHaveBeenCalledWith("dragon", {
      limit: 4,
      includeDrafts: true,
    });
    expect(search.statusMessage).toBeNull();
  });

  it("uses metadata fallback for an idle index, then retries when ready", async () => {
    const { search, service, progress } = setup("idle");
    await tick();
    expect(service.search).not.toHaveBeenCalled();
    expect(search.textSearchUnavailable).toBe(true);
    progress({ status: "ready" });
    await tick();
    await vi.waitFor(() =>
      expect(search.textMatchIds?.has("dragon")).toBe(true),
    );
  });

  it("ignores stale results and unsubscribes on destruction", async () => {
    const { search, service, setQuery, unsubscribe } = setup();
    let finish!: (value: { id: string }[]) => void;
    service.search.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    await tick();
    expect(search.statusMessage).toBe("Searching indexed content…");
    setQuery("#hero");
    await tick();
    finish([{ id: "stale" }]);
    await tick();
    expect(search.textMatchIds).toBeNull();
    expect(search.textSearchPending).toBe(false);
    disposers.pop()!();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("reports search failures and partial indexing without repeating searches on progress counts", async () => {
    const { search, service, progress } = setup();
    service.search.mockRejectedValueOnce(new Error("offline"));
    await tick();
    await vi.waitFor(() => expect(search.textSearchError).toBe("offline"));
    expect(search.textSearchUnavailable).toBe(true);
    expect(search.statusMessage).toContain("temporarily unavailable");
    progress({ status: "rebuilding", isPartial: true });
    await tick();
    await vi.waitFor(() => expect(search.textMatchIds).not.toBeNull());
    expect(search.statusMessage).toContain("still indexing");
    progress({ indexedCount: 3 });
    await tick();
    expect(service.search).toHaveBeenCalledTimes(2);
  });
});
