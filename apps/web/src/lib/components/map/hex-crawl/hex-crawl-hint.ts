import type { NoticeStorage } from "./hex-discovery-notice";

/** Device-local key: the first-use hint for the hex panel has been dismissed (FR-045). */
export const HEX_HINT_KEY = "codex-hex-crawl-hint-seen";

export const HEX_HINT_TEXT =
  "Click an empty hex, or use Go to hex, to open it. Terrain, notes and entities stay with the GM.";

export function isHexHintSeen(storage: NoticeStorage | null): boolean {
  try {
    return storage?.getItem(HEX_HINT_KEY) === "1";
  } catch {
    return false;
  }
}

export function markHexHintSeen(storage: NoticeStorage | null): void {
  try {
    storage?.setItem(HEX_HINT_KEY, "1");
  } catch {
    // The hint will show again next time, which is harmless.
  }
}
