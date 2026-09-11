import type { FactionResolution, OutcomeBandId } from "./types";

/**
 * Local narration fallback.
 *
 * This is what a turn reads like when AI narration is switched off, the provider
 * is unreachable, or its response could not be used. Because FR-021d makes "a
 * turn is never blocked by AI" a hard requirement, this function must be
 * synchronous, total, and free of anything that can throw.
 *
 * It deliberately avoids naming dice, totals or band ids. Those already have a
 * precise display in the resolution breakdown; repeating them in prose reads as
 * a debug dump rather than an account of what happened (Constitution IX).
 */
const TEMPLATES: Record<OutcomeBandId, (a: string, t: string) => string> = {
  "decisive-success": (a, t) =>
    `${a} moved on ${t} and met almost no resistance. Doors that were closed a season ago now open on request, and the change is plain enough that neighbours have started to comment.`,
  success: (a, t) =>
    `${a} extended their reach into ${t}. It cost them something to arrange, but the arrangement holds.`,
  mixed: (a, t) =>
    `${a} pressed their case in ${t} and came away with less than they wanted. A few quiet agreements, nothing anyone would call a shift in power.`,
  failure: (a, t) =>
    `${a} overreached in ${t}. Their approach was rebuffed, and the people they leaned on have grown noticeably harder to reach.`,
  backfire: (a, t) =>
    `${a} badly misjudged ${t}. What was meant to win them standing has cost them it instead, and someone there is now actively working against their interests.`,
};

const UNNAMED_FACTION = "An unnamed faction";
const UNNAMED_TARGET = "an unnamed place";

export function buildTemplateNarrative(
  resolution: FactionResolution,
  factionTitle: string,
  targetTitle: string,
): string {
  // Empty titles are defensive rather than expected — a deleted or half-created
  // entity must degrade to readable prose, not crash the turn this function
  // exists to rescue.
  const acting = factionTitle.trim() || UNNAMED_FACTION;
  const target = targetTitle.trim() || UNNAMED_TARGET;
  return TEMPLATES[resolution.finalBand](acting, target);
}
