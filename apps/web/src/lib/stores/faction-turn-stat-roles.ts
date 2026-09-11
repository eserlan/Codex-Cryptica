import type { Entity, FactionStatRole } from "schema";

export const BUILTIN_FACTION_TURN_TEMPLATE_ID = "builtin-faction-turn";

const BUILTIN_FACTION_TURN_ROLES: readonly FactionStatRole[] = [
  "power",
  "influence",
  "resources",
  "stability",
];

/** The built-in sheet uses the role ids as its numeric stat ids. */
export function isBuiltInFactionTurnSheet(entity: Entity): boolean {
  return entity.statSheet?.templateId === BUILTIN_FACTION_TURN_TEMPLATE_ID;
}

/**
 * The built-in faction sheet has no ambiguous labels to map. Keep the mapping
 * in entity state so the engine remains independent from UI template ids.
 */
export function builtInFactionTurnRoleMappings(
  entity: Entity,
): Partial<Record<FactionStatRole, string>> {
  if (!isBuiltInFactionTurnSheet(entity)) return {};

  const numericFieldIds = new Set(
    (entity.statSheet?.fields ?? [])
      .filter((field) => field.type === "number")
      .map((field) => field.id),
  );

  return Object.fromEntries(
    BUILTIN_FACTION_TURN_ROLES.filter((role) => numericFieldIds.has(role)).map(
      (role) => [role, role],
    ),
  ) as Partial<Record<FactionStatRole, string>>;
}
