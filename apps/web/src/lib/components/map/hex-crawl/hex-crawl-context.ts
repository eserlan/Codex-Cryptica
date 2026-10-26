import { getContext, setContext } from "svelte";
import type { HexCrawlStore } from "$lib/stores/hex-crawl/hex-crawl.svelte";

const HEX_CRAWL_STORE = Symbol("hex-crawl-store");

/**
 * Provide the Hex Crawl store to the map subtree. The map view calls this
 * once. Components read it with `useHexCrawlStore`, so they never import a
 * singleton and stay testable with a fake (Constitution VIII).
 */
export function provideHexCrawlStore(store: HexCrawlStore | null): void {
  setContext(HEX_CRAWL_STORE, store);
}

/** The store, or null when no map has provided one. Call during component init. */
export function useHexCrawlStore(): HexCrawlStore | null {
  return getContext<HexCrawlStore | null | undefined>(HEX_CRAWL_STORE) ?? null;
}
