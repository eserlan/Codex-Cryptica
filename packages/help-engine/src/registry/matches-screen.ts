import type { HelpContext } from "../context";
import type { FeatureEntry } from "./schema";

/** Narrow screen hints to the feature's actual tab and entity kind. Explicit
 * questions can still retrieve any feature; this only controls screen boosts. */
export function featureMatchesScreen(
  feature: FeatureEntry,
  ctx: HelpContext,
): boolean {
  if (!feature.areas.includes(ctx.area)) return false;
  // "other" is what every unrecognised screen reports, so a feature filed
  // there would otherwise count as on screen almost everywhere and collect
  // screen boosts for questions it has nothing to do with. Only its own route
  // counts.
  if (ctx.area === "other" && !feature.routes.includes(ctx.routeTemplate))
    return false;
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
