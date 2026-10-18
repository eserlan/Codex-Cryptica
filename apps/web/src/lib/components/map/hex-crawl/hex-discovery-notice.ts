/** Device-local key: the one-time AI disclosure has been dismissed (FR-031). */
export const AI_NOTICE_KEY = "codex-hex-crawl-ai-notice-dismissed";

export const AI_NOTICE_TEXT =
  "Exploring sends this hex's terrain, notes and nearby lore to the AI service. Your full vault is never sent. Turn on AI Disabled to use built-in terrain tables instead.";

export interface NoticeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Storage can be blocked or full. A failure means the notice shows again, which is safe. */
export function isAiNoticeDismissed(storage: NoticeStorage | null): boolean {
  try {
    return storage?.getItem(AI_NOTICE_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissAiNotice(storage: NoticeStorage | null): void {
  try {
    storage?.setItem(AI_NOTICE_KEY, "1");
  } catch {
    // Nothing else to do: the notice will simply show again next time.
  }
}
