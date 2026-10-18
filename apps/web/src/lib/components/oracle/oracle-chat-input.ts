export const ORACLE_CHAT_INPUT_EVENT = "oracle-chat-input";

let pendingDraft = "";

export function getOracleChatDraft(): string {
  return pendingDraft;
}

export function setOracleChatDraft(text: string): void {
  pendingDraft = text;
}

export function clearOracleChatDraft(): void {
  pendingDraft = "";
}

export function addToOracleChatInput(text: string): boolean {
  if (typeof window === "undefined" || !text.trim()) return false;

  const trimmed = text.trim();
  pendingDraft = pendingDraft.trim() ? `${pendingDraft}\n${trimmed}` : trimmed;

  const event = new CustomEvent<string>(ORACLE_CHAT_INPUT_EVENT, {
    detail: trimmed,
    cancelable: true,
  });
  window.dispatchEvent(event);
  return true;
}

/**
 * Takes a shortcut prompt waiting on the Oracle UI, once. It only fills the
 * input: the player still edits it and presses Send (Solo Play Loop, FR-019).
 */
export function takeOraclePrefill(ui: {
  takePendingPrompt(): string | null;
}): string | null {
  return ui.takePendingPrompt();
}
