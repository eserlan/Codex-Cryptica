const CLOSING_TAG = "</USER_CONTENT>";
const ESCAPED_TAG = "<\\/USER_CONTENT>";

export function u(content: string): string {
  if (!content.trim()) return "";
  const safe = content.replaceAll(CLOSING_TAG, ESCAPED_TAG);
  return `<USER_CONTENT>\n${safe}\n</USER_CONTENT>`;
}
