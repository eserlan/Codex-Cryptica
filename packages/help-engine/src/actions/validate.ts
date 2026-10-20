import type { HelpContext } from "../context";
import {
  CONTROL_CATALOGUE,
  entityTabForPanel,
  GENERATOR_REQUIRED_FLAG,
  VTT_PANEL_IDS,
  type ControlId,
  type PanelId,
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
  /**
   * Extra IDs the caller vouches for in this call only (onboarding journeys
   * pass `SHELL_CONTROL_IDS`). Never written back into the screen description.
   */
  extraAvailable?: readonly string[];
}

function controlIsOnScreen(
  target: ControlId,
  ctx: HelpContext,
  previous?: GuidanceStep,
): boolean {
  const spec = CONTROL_CATALOGUE[target];
  // "solo" and "shell" controls sit on every screen, so only their flags and
  // availability decide.
  if (spec.area !== "solo" && spec.area !== "shell" && spec.area !== ctx.area)
    return false;
  if (!controlFlagsAllow(spec, ctx)) return false;
  if (ctx.availableActions.includes(target)) return true;
  // A control inside a panel is reachable when the step before it opens that
  // panel, which is how "open Status, then highlight Add" is one guide.
  return (
    previous?.type === "openPanel" &&
    spec.panel !== undefined &&
    spec.panel === previous.panel
  );
}

function controlFlagsAllow(
  spec: (typeof CONTROL_CATALOGUE)[ControlId],
  ctx: HelpContext,
): boolean {
  return (
    (!spec.requiresFlag || ctx.flags.includes(spec.requiresFlag)) &&
    (!spec.requiresNoFlag || !ctx.flags.includes(spec.requiresNoFlag))
  );
}

function panelIsValid(panel: PanelId, ctx: HelpContext): boolean {
  // The VTT panels belong to the map and nowhere else.
  const isVtt = (VTT_PANEL_IDS as readonly string[]).includes(panel);
  if (isVtt && ctx.area !== "map") return false;
  const tab = entityTabForPanel(panel);
  if (tab && ctx.area !== "entity-detail") return false;
  if (tab === "family" && ctx.entityKind !== "character") return false;
  return ctx.availableActions.includes(panel);
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
      return panelIsValid(step.panel, ctx);
    case "highlight":
      return controlIsOnScreen(step.target, ctx, previous);
    case "openGenerator":
      return (
        ctx.surface === "vault" && ctx.flags.includes(GENERATOR_REQUIRED_FLAG)
      );
    case "openFeedback":
      // The report form works everywhere, guests and public pages included.
      return true;
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

  // A copy, so the caller's extra IDs count for this call only.
  const scoped = deps.extraAvailable?.length
    ? {
        ...ctx,
        availableActions: [...ctx.availableActions, ...deps.extraAvailable],
      }
    : ctx;
  if (!stepIsValid(action, scoped, deps)) return null;
  if (action.then && !stepIsValid(action.then, scoped, deps, action))
    return null;
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
