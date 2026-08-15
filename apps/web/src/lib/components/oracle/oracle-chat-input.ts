export const ORACLE_CHAT_INPUT_EVENT = "oracle-chat-input";

export function addToOracleChatInput(text: string): boolean {
  if (typeof window === "undefined" || !text.trim()) return false;

  const event = new CustomEvent<string>(ORACLE_CHAT_INPUT_EVENT, {
    detail: text,
    cancelable: true,
  });
  return !window.dispatchEvent(event);
}
