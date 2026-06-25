import { sessionHubStore } from "$lib/stores/session-hub.svelte";
import { getContextSelection } from "generator-engine";

export const SESSION_DRAFTS_KEY = "SESSION_DRAFTS";

export function getSessionContext(): string {
  if (typeof window === "undefined") return "";

  const selection = getContextSelection(sessionHubStore.entities);
  if (selection.entities.length === 0) return "";

  const lines = selection.entities.map((d) => {
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
}
