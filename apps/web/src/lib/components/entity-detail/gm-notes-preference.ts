import { browserStorage, type StorageLike } from "#lib/utils/runtime-deps.js";

const KEY = "codex-entity-gm-notes-open";

/** Whether the user last left the GM notes section open. Storage can be blocked, so this never throws. */
export function readGmNotesOpen(
  storage: StorageLike = browserStorage,
): boolean {
  try {
    return storage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeGmNotesOpen(
  open: boolean,
  storage: StorageLike = browserStorage,
): void {
  try {
    storage.setItem(KEY, open ? "1" : "0");
  } catch {
    // The preference is a convenience only.
  }
}
