const KEY = "zen-sidebar-collapsed";

/** Whether the user last hid the Zen sidebar. Storage can be blocked, so this never throws. */
export function readSidebarCollapsed(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeSidebarCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(KEY, collapsed ? "1" : "0");
  } catch {
    // The preference is a convenience only.
  }
}
