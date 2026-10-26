import { sessionHubStore } from "$lib/stores/session-hub.svelte";
import { getContextSelection } from "generator-engine";

export const SESSION_DRAFTS_KEY = "SESSION_DRAFTS";

export function getSessionContext(
  options: { excludeLanguageDrafts?: boolean } = {},
): string {
  if (typeof window === "undefined") return "";

  // A generated public-page draft is reusable session context by default.
  // Feeding a prior language back into the next language request made the
  // model preserve its identity across changed controls (#1910). Callers can
  // exclude only language drafts while retaining other campaign continuity.
  const candidates = options.excludeLanguageDrafts
    ? sessionHubStore.entities.filter(
        (entity) =>
          entity.kind !== "language" &&
          !entity.labels.some(
            (label) => label.toLocaleLowerCase() === "language",
          ),
      )
    : sessionHubStore.entities;
  const selection = getContextSelection(candidates);
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
