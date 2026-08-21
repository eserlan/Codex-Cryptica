import type { Entity } from "schema";
import type { FactionStatRole } from "./types";

/**
 * Resolving a role to the stat that fulfils it.
 *
 * Roles are stored as stat sheet **field ids**, never labels, so a GM is free to
 * name their stats for their setting — "Political Reach" in a court intrigue
 * game, "Fleet Command" in a space opera — without the resolver losing track of
 * which number to use (FR-004a).
 *
 * Every failure here is a value, never a throw: FR-005 requires the system to
 * name the missing role and decline to resolve, which is a message to the GM
 * rather than an error condition.
 */

export type RoleResolution =
  | {
      mapped: true;
      fieldId: string;
      /** Snapshot of the GM's current label, recorded on the turn so later
       * renames do not retroactively reinterpret old history. */
      label: string;
      value: number;
      min?: number;
      max?: number;
    }
  | { mapped: false };

const UNMAPPED: RoleResolution = { mapped: false };

export function resolveRole(
  faction: Entity,
  role: FactionStatRole,
): RoleResolution {
  const fieldId = faction.factionTurn?.statRoles?.[role];
  if (!fieldId) return UNMAPPED;

  const field = faction.statSheet?.fields?.find((f) => f.id === fieldId);
  // A mapping pointing at a field the GM has since deleted reads as unmapped.
  // The alternative — throwing — would break the whole tab over a stat they
  // removed months ago.
  if (!field) return UNMAPPED;

  // Deliberately no coercion. Treating a text field or an empty value as 0
  // would resolve turns against a stat the GM never scored, producing outcomes
  // they cannot explain from the breakdown.
  if (typeof field.value !== "number" || !Number.isFinite(field.value)) {
    return UNMAPPED;
  }

  return {
    mapped: true,
    fieldId,
    label: field.label,
    value: field.value,
    min: field.min,
    max: field.max,
  };
}

export function isRoleMapped(faction: Entity, role: FactionStatRole): boolean {
  return resolveRole(faction, role).mapped;
}

/**
 * Which of the roles an action requires are not usable.
 *
 * Only the roles passed in are checked — an action must never be blocked by a
 * role it does not use (FR-005).
 */
export function missingRoles(
  faction: Entity,
  required: FactionStatRole[],
): FactionStatRole[] {
  return required.filter((role) => !isRoleMapped(faction, role));
}
