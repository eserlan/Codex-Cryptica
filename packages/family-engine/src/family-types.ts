/**
 * Family relationship connection types layered over the standard entity
 * connection model. Kept data-driven (a single source list + inverse map) so
 * future kinds (adoption, guardianship, half-siblings, former partners, etc.)
 * extend it without restructuring callers (spec FR-017).
 */
export type FamilyConnectionType = "parent_of" | "child_of" | "spouse_of";

export const FAMILY_CONNECTION_TYPES: readonly FamilyConnectionType[] = [
  "parent_of",
  "child_of",
  "spouse_of",
];

/** parent_of <-> child_of; spouse_of is symmetric (its own inverse). */
const INVERSE_FAMILY_TYPE: Record<FamilyConnectionType, FamilyConnectionType> =
  {
    parent_of: "child_of",
    child_of: "parent_of",
    spouse_of: "spouse_of",
  };

/** True when a connection type string is one of the family relationship types. */
export function isFamilyType(type: string): type is FamilyConnectionType {
  return (FAMILY_CONNECTION_TYPES as readonly string[]).includes(type);
}

/** Returns the inverse family type written onto the other entity. */
export function inverseFamilyType(
  type: FamilyConnectionType,
): FamilyConnectionType {
  return INVERSE_FAMILY_TYPE[type];
}
