import type { SmartPredicate, ResolveContext } from "./types";

/**
 * Predicates stay declarative data rather than callbacks so generator rules can
 * be read, diffed and linted without being executed (#2337). `validateSchema`
 * in `resolve.ts` relies on being able to walk them statically.
 */
export function evaluate(
  predicate: SmartPredicate,
  ctx: ResolveContext,
): boolean {
  if ("axis" in predicate) {
    const resolved = ctx.values[predicate.axis];
    // An unresolved axis cannot satisfy a condition. Axes resolve in
    // declaration order, so this only happens for a forward reference, which
    // validateSchema reports.
    return resolved !== undefined && predicate.anyOf.includes(resolved);
  }
  if ("trait" in predicate) return ctx.traits.includes(predicate.trait);
  if ("not" in predicate) return !evaluate(predicate.not, ctx);
  if ("all" in predicate) return predicate.all.every((p) => evaluate(p, ctx));
  return predicate.any.some((p) => evaluate(p, ctx));
}

/** Every axis id a predicate reads, for schema validation. */
export function referencedAxes(predicate: SmartPredicate): string[] {
  if ("axis" in predicate) return [predicate.axis];
  if ("trait" in predicate) return [];
  if ("not" in predicate) return referencedAxes(predicate.not);
  if ("all" in predicate) return predicate.all.flatMap(referencedAxes);
  return predicate.any.flatMap(referencedAxes);
}
