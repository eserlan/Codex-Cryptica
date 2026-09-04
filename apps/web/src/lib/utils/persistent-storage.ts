import { debugStore } from "$lib/stores/debug.svelte";

/**
 * Asks the browser to make this origin's storage persistent (#2619).
 *
 * Codex Cryptica keeps the canonical vault in OPFS and its fast-start cache in
 * IndexedDB. Both live in the same origin storage bucket, and without a
 * persistence grant that bucket is "best-effort": the browser may evict all of
 * it under storage pressure, taking the user's campaign with it. A grant also
 * raises the quota, which matters because a full quota makes cache writes fail
 * — the failure mode behind this issue.
 *
 * Deliberately fire-and-forget. On most browsers a request from an installed
 * app or a site with meaningful engagement is granted silently; where it is
 * refused there is nothing to do about it, and nothing here should be able to
 * hold up or break startup.
 */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) {
      return false;
    }

    // Asking again when already granted is wasteful and, in some browsers,
    // re-prompts.
    if (await navigator.storage.persisted?.()) {
      debugStore.log("[Storage] Already persistent.");
      return true;
    }

    const granted = await navigator.storage.persist();
    debugStore.log(
      granted
        ? "[Storage] Persistence granted; the vault is safe from eviction."
        : "[Storage] Persistence refused; storage remains evictable.",
    );
    return granted;
  } catch (err) {
    debugStore.warn("[Storage] Could not request persistence:", err);
    return false;
  }
}
