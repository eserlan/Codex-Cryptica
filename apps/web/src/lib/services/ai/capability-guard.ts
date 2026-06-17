import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";

export function assertAIEnabled(storage: StorageLike = browserStorage) {
  if (!isAIEnabled(storage)) {
    throw new Error("AI features are disabled.");
  }
}

export function isAIEnabled(storage: StorageLike = browserStorage): boolean {
  // `browserStorage` is SSR-safe and swallows access errors (returning null), so
  // in workers / when localStorage is unavailable both lookups are null and we
  // fall through to `true` — preserving the previous "don't block" behaviour.
  // The actual text generation call is gated by the main-thread OracleStore.
  if (storage.getItem("codex_ai_disabled") === "true") return false;

  // Fallback to old "lite" flag if present.
  if (storage.getItem("codex_ai_lite_mode") === "true") return false;

  return true;
}
