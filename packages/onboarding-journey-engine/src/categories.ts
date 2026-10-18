import type {
  Milestone,
  MilestoneContext,
  MilestoneMatcher,
  StepDefinition,
} from "./types";

/**
 * The categories a matcher accepts in this vault: the named ones that exist,
 * or null for "any new entry" (no categories named, or none of them exist).
 */
function requiredCategories(
  matcher: Extract<MilestoneMatcher, { kind: "entry-created" }>,
  ctx: MilestoneContext,
): string[] | null {
  if (!matcher.categories?.length) return null;
  const present = matcher.categories.filter((c) =>
    ctx.availableCategories.has(c),
  );
  return present.length ? present : null;
}

export function milestoneMatches(
  matcher: MilestoneMatcher,
  milestone: Milestone,
  ctx: MilestoneContext,
): boolean {
  if (matcher.kind !== milestone.kind) return false;
  if (matcher.kind === "entry-created" && milestone.kind === "entry-created") {
    const required = requiredCategories(matcher, ctx);
    return required === null || required.includes(milestone.category);
  }
  if (matcher.kind === "screen" && milestone.kind === "screen") {
    return matcher.area === milestone.area;
  }
  return true;
}

/** The step's wording, switched to `anyEntryCopy` when its categories are missing. */
export function stepInstruction(
  step: StepDefinition,
  ctx: MilestoneContext,
): string {
  const m = step.completeOn;
  if (
    m.kind === "entry-created" &&
    m.categories?.length &&
    requiredCategories(m, ctx) === null
  ) {
    return step.anyEntryCopy ?? step.instruction;
  }
  return step.instruction;
}
