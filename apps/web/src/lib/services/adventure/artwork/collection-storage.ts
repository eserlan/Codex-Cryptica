import type { CollectionIndexState } from "./collection-index";

export const COLLECTION_INDEX_KEY = "codex-adventure-artwork-cache:v1";
const safeCollectionId = (id: string) =>
  id.length <= 100 && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
function safeUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.includes("%")) return false;
  try {
    const url = new URL(value);
    return (
      url.origin === "https://assets.codexcryptica.com" &&
      !url.username &&
      !url.password &&
      !url.search &&
      !url.hash &&
      /^\/adventure-artwork\/[a-zA-Z0-9_/-]+\.webp$/.test(url.pathname)
    );
  } catch {
    return false;
  }
}
/** Invalid indexes fail closed so a corrupt record cannot expose protected bytes to eviction. */
export function readCollectionIndex(
  storage: Pick<Storage, "getItem">,
): CollectionIndexState {
  const raw = storage.getItem(COLLECTION_INDEX_KEY);
  if (raw === null) return { version: 1, collections: {}, suppressed: [] };
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    throw new Error("Invalid artwork cache index");
  const state = parsed as Record<string, unknown>;
  if (
    state.version !== 1 ||
    !state.collections ||
    typeof state.collections !== "object" ||
    Array.isArray(state.collections) ||
    !Array.isArray(state.suppressed) ||
    state.suppressed.some(
      (id: unknown) => typeof id !== "string" || !safeCollectionId(id),
    )
  )
    throw new Error("Invalid artwork cache index");
  const collections = state.collections as Record<string, unknown>;
  for (const [id, files] of Object.entries(collections)) {
    if (
      !safeCollectionId(id) ||
      !Array.isArray(files) ||
      files.some(
        (file: unknown) =>
          !file ||
          typeof file !== "object" ||
          !safeUrl((file as { id?: unknown }).id) ||
          !Number.isSafeInteger((file as { bytes?: unknown }).bytes) ||
          Number((file as { bytes?: unknown }).bytes) <= 0,
      )
    )
      throw new Error("Invalid artwork cache index");
  }
  return parsed as CollectionIndexState;
}
export function writeCollectionIndex(
  storage: Pick<Storage, "setItem">,
  value: CollectionIndexState,
): void {
  storage.setItem(COLLECTION_INDEX_KEY, JSON.stringify(value));
}
