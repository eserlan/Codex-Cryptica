import type { AdventureJsonV1 } from "@codex/adventure-engine";
import type { AdventureManager } from "#lib/stores/oracle/adventure-manager.svelte.js";

/** Loads the session's pinned package, reloading when the session or hash changes. Call during component init. */
export function trackSourcePackage(getManager: () => AdventureManager) {
  let pkg = $state<AdventureJsonV1 | null>(null);
  const sourceKey = $derived(
    JSON.stringify([
      getManager().session?.id ?? null,
      getManager().session?.sourcePackage?.hash ?? null,
    ]),
  );
  $effect(() => {
    const manager = getManager();
    const [, hash] = JSON.parse(sourceKey) as [string | null, string | null];
    pkg = null;
    if (!hash) return;
    let stale = false;
    manager.loadSourcePackage().then((loaded) => {
      if (!stale) pkg = loaded;
    });
    return () => {
      stale = true;
    };
  });
  return {
    get current() {
      return pkg;
    },
  };
}
