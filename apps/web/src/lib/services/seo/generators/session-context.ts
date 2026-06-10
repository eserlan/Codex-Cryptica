/**
 * Builds an AI prompt fragment from the Session Hub drafts stored in
 * sessionStorage, so generators can reference elements the user already
 * created this session (e.g. an NPC can belong to a generated faction).
 */
export const SESSION_DRAFTS_KEY = "__codex_session_drafts";

export function getSessionContext(): string {
  if (typeof sessionStorage === "undefined") return "";
  try {
    const raw = sessionStorage.getItem(SESSION_DRAFTS_KEY);
    if (!raw) return "";
    const drafts = JSON.parse(raw);
    if (!Array.isArray(drafts) || drafts.length === 0) return "";
    const lines = drafts.slice(0, 8).map((d) => {
      const excerpt = String(d.summary || d.content || "")
        .replace(/[#*`]+/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);
      return `- ${d.title} (${d.type}): ${excerpt}`;
    });
    return (
      "Existing campaign elements created this session — weave in references to one or more of them for continuity where it fits naturally, but do not duplicate them:\n" +
      lines.join("\n")
    );
  } catch {
    return "";
  }
}
