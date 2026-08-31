/**
 * Which cloud a vault is mirrored to.
 *
 * Google Drive and Codex Cryptica Cloud both hold a whole-vault copy and both
 * restore over the local one, so running both at once gives a vault two
 * competing sources of truth and no rule for which wins. The choice is
 * therefore exclusive: one destination, or none.
 *
 * The active destination is derived from what is actually set up rather than
 * stored as a separate preference, so the picker can never disagree with the
 * connections themselves.
 */

export type CloudDestination = "none" | "drive" | "cc-cloud";

export interface CloudDestinationInput {
  /** A Drive folder is linked to this vault. */
  driveConnected: boolean;
  /** Cloud Backup is switched on for this vault. */
  cloudBackupOn: boolean;
}

export interface CloudDestinationState {
  active: CloudDestination;
  /**
   * Both destinations are set up. Only reachable for vaults configured before
   * the choice became exclusive; the UI must say so and offer a way out rather
   * than silently picking one.
   */
  conflict: boolean;
}

export const DESTINATION_LABEL: Record<CloudDestination, string> = {
  none: "No cloud copy",
  drive: "Google Drive",
  "cc-cloud": "Codex Cryptica Cloud",
};

export function resolveCloudDestination(
  input: CloudDestinationInput,
): CloudDestinationState {
  const { driveConnected, cloudBackupOn } = input;
  if (driveConnected && cloudBackupOn) {
    // Drive is named as the active one because it is the older integration:
    // a vault that has both was almost certainly on Drive first.
    return { active: "drive", conflict: true };
  }
  if (driveConnected) return { active: "drive", conflict: false };
  if (cloudBackupOn) return { active: "cc-cloud", conflict: false };
  return { active: "none", conflict: false };
}

export interface SelectionVerdict {
  allowed: boolean;
  /** Why the choice is blocked, phrased for the user. */
  reason?: string;
}

/**
 * Whether the user may switch to `target` right now. Switching away from a
 * live destination is blocked rather than done implicitly: turning off Drive
 * or Cloud Backup has consequences the user should confirm in that
 * destination's own panel, where the disconnect and delete actions live.
 */
export function canSelectDestination(
  target: CloudDestination,
  state: CloudDestinationState,
): SelectionVerdict {
  if (target === state.active) return { allowed: true };
  if (state.active === "none") return { allowed: true };
  if (target === "none") return { allowed: true };
  return {
    allowed: false,
    reason: `Turn off ${DESTINATION_LABEL[state.active]} first — a vault can only be mirrored to one cloud.`,
  };
}
