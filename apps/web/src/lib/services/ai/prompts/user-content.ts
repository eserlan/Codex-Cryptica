export function u(content: string): string {
  if (!content.trim()) return "";
  return `<USER_CONTENT>\n${content}\n</USER_CONTENT>`;
}
