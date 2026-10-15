import { browserStorage, type StorageLike } from "$lib/utils/runtime-deps";

const KEY = "zen-sidebar-collapsed";

/** Whether the user last hid the Zen sidebar. Storage can be blocked, so this never throws. */
export function readSidebarCollapsed(storage: StorageLike = browserStorage): boolean {
  try {
    return storage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean, storage: StorageLike = browserStorage): void {
  try {
    storage.setItem(KEY, collapsed ? "1" : "0");
  } catch {
    // The preference is a convenience only.
  }
}
