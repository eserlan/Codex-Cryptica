export const ORACLE_CHAT_INPUT_EVENT = "oracle-chat-input";

export function addToOracleChatInput(text: string): boolean {
  if (typeof window === "undefined" || !text.trim()) return false;

  window.dispatchEvent(
    new CustomEvent<string>(ORACLE_CHAT_INPUT_EVENT, { detail: text }),
  );
  return true;
}
