import type { HexRecord } from "./model";

export type HexExplorationState = "unknown" | "seen" | "explored";

/**
 * Derive a hex's exploration state (FR-013, FR-014). Explored is stored on the
 * record and survives re-fogging. Seen and Unknown come from the fog mask: the
 * web layer passes `revealed` (hex centre uncovered, or fog off).
 */
export function deriveHexState(
  record: HexRecord | undefined,
  revealed: boolean,
): HexExplorationState {
  if (record?.explored) return "explored";
  return revealed ? "seen" : "unknown";
}
