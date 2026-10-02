import type { HelpContext } from "../context";
import {
  CONTROL_CATALOGUE,
  GENERATOR_REQUIRED_FLAG,
  type ControlId,
} from "./catalogue";
import {
  GuidanceActionSchema,
  type ActionRef,
  type GuidanceAction,
  type GuidanceStep,
} from "./types";

export interface ActionDeps {
  /** IDs of help articles that exist, so `openHelp` cannot point nowhere. */
  helpIds: ReadonlySet<string>;
}

function controlIsOnScreen(
  target: ControlId,
  ctx: HelpContext,
  previous?: GuidanceStep,
): boolean {
  const spec = CONTROL_CATALOGUE[target];
  if (spec.area !== ctx.area) return false;
  if (spec.requiresFlag && !ctx.flags.includes(spec.requiresFlag)) return false;
  if (ctx.availableActions.includes(target)) return true;
  // A control inside a panel is reachable when the step before it opens that
  // panel, which is how "open Status, then highlight Add" is one guide.
  return (
    previous?.type === "openPanel" &&
    spec.panel !== undefined &&
    spec.panel === previous.panel
  );
}

function stepIsValid(
  step: GuidanceStep,
  ctx: HelpContext,
  deps: ActionDeps,
  previous?: GuidanceStep,
): boolean {
  switch (step.type) {
    case "navigate":
      return ctx.surface === "vault";
    case "openHelp":
      return deps.helpIds.has(step.helpId);
    case "openPanel":
      return ctx.availableActions.includes(step.panel);
    case "highlight":
      return controlIsOnScreen(step.target, ctx, previous);
    case "openGenerator":
      return (
        ctx.surface === "vault" && ctx.flags.includes(GENERATOR_REQUIRED_FLAG)
      );
  }
}

/**
 * Returns the action if it is on the allow-list and valid for the current
 * screen, otherwise null. Null means "discard it and show only the answer".
 */
export function validateAction(
  input: unknown,
  ctx: HelpContext,
  deps: ActionDeps,
): GuidanceAction | null {
  const parsed = GuidanceActionSchema.safeParse(input);
  if (!parsed.success) return null;
  const action = parsed.data as GuidanceAction;

  if (!stepIsValid(action, ctx, deps)) return null;
  if (action.then && !stepIsValid(action.then, ctx, deps, action)) return null;
  return action;
}

/** The registry actions that are valid right now, deduplicated by ID. */
export function buildActionCandidates(
  refs: readonly ActionRef[],
  ctx: HelpContext,
  deps: ActionDeps,
): ActionRef[] {
  const seen = new Set<string>();
  const out: ActionRef[] = [];
  for (const ref of refs) {
    if (seen.has(ref.id)) continue;
    const action = validateAction(ref.action, ctx, deps);
    if (!action) continue;
    seen.add(ref.id);
    out.push({ id: ref.id, action });
  }
  return out;
}
