import type { HelpContext } from "../context";
import type { FeatureEntry } from "./schema";

/** Narrow screen hints to the feature's actual tab and entity kind. Explicit
 * questions can still retrieve any feature; this only controls screen boosts. */
export function featureMatchesScreen(
  feature: FeatureEntry,
  ctx: HelpContext,
): boolean {
  if (!feature.areas.includes(ctx.area)) return false;
  if (
    feature.tabs.length > 0 &&
    (ctx.area === "entity-detail" || ctx.area === "settings") &&
    (ctx.tab === null || !feature.tabs.includes(ctx.tab))
  )
    return false;
  if (
    feature.kinds !== "any" &&
    (ctx.entityKind === null || !feature.kinds.includes(ctx.entityKind))
  )
    return false;
  return true;
}
