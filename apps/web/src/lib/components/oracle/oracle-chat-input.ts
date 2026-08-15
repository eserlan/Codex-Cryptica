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
