/** GM-facing views of the structured state: routes, who is where, theories, decisions. */

import { whereaboutsTimeline } from "./one-shot-state";
import type {
  OneShotAdventure,
  OneShotClue,
  OneShotEnding,
  OneShotScene,
} from "./one-shot-types";

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join("\n");

const titleOf = (adventure: OneShotAdventure, id: string) =>
  adventure.scenes.find((s) => s.id === id)?.title ?? id;

/** What each way onward risks and finds, when the scene says. */
export function routesOut(
  adventure: OneShotAdventure,
  scene: OneShotScene,
): string {
  if (!scene.routes?.length) return "";
  return `**Ways onward**\n${bullets(
    scene.routes.map(
      (r) =>
        `**${titleOf(adventure, r.to)}:** risks ${r.risk.replace(/\.$/, "")}; finds ${r.find.replace(/\.$/, "")}.`,
    ),
  )}`;
}

/** Where each person and important object is, scene by scene. */
export function whereEveryoneIs(adventure: OneShotAdventure): string {
  if (!adventure.scenes.some((s) => s.whereabouts?.length)) return "";
  const rows = whereaboutsTimeline(adventure)
    .filter((t) => t.entries.length)
    .map(({ scene, entries }, i) => {
      const who = entries
        .map(
          (e) =>
            `${e.name} (${e.state}${e.where ? `, ${e.where}` : ""}${e.how ? `; ${e.how.replace(/\.$/, "")}` : ""})`,
        )
        .join("; ");
      return `${i + 1}. **${scene.title}:** ${who}`;
    });
  return `\n## Where Everyone Is\n${rows.join("\n")}\n`;
}

const clueNames = (clues: OneShotClue[]) =>
  clues.map((c) => c.label ?? c.text).join(", ") || "nothing yet";

/** Competing theories and the clues that back or rule out each. */
export function theoriesBlock(adventure: OneShotAdventure): string {
  if (!adventure.theories?.length) return "";
  const rows = adventure.theories.map((t) => {
    const tags = [t.isTrue ? "true" : "false", t.obvious ? "obvious" : ""]
      .filter(Boolean)
      .join(", ");
    const backs = adventure.clues.filter((c) => c.supports?.includes(t.id));
    const rules = adventure.clues.filter((c) => c.contradicts?.includes(t.id));
    return `- **${t.name}** (${tags}): ${t.summary}\n  - Backed by: ${clueNames(backs)}\n  - Ruled out by: ${clueNames(rules)}`;
  });
  return `\n## Theories\n${rows.join("\n")}\n`;
}

/** The decisions behind the endings, as "when stopped yes, clean no". */
export function endingWhen(
  adventure: OneShotAdventure,
  ending: OneShotEnding,
): string {
  const parts = Object.entries(ending.requires ?? {}).map(([id, value]) => {
    const question = adventure.decisions?.find((d) => d.id === id)?.question;
    return `${question ?? id} ${value ? "Yes" : "No"}`;
  });
  return parts.length ? ` _(${parts.join(" · ")})_` : "";
}
