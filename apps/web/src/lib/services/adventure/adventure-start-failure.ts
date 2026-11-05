/** Typed reasons a new adventure failed to start or open. */
export type AdventureStartFailure =
  | "offline"
  | "opening-rejected"
  | "opening-failed"
  | "save-failed"
  | "storage-full"
  | "storage-permission"
  | "control-lost"
  | "cleanup-failed";

const PRESERVED = " Your setup has been preserved.";

/**
 * Fixed, user-safe copy for each failure. Never interpolates Oracle, Vault or
 * storage error text, which may contain private content.
 */
export function describeAdventureStartFailure(
  failure: AdventureStartFailure,
): string {
  switch (failure) {
    case "offline":
      return "Connect to the internet and retry." + PRESERVED;
    case "opening-rejected":
      return (
        "Oracle's opening could not be used. Retry to generate a new one." +
        PRESERVED
      );
    case "opening-failed":
      return (
        "Oracle could not write the opening scene. Check Oracle and retry." +
        PRESERVED
      );
    case "save-failed":
      return (
        "The opening scene could not be saved to the Vault. Reopen the Vault and retry." +
        PRESERVED
      );
    case "storage-full":
      return "Device storage is full. Free some space and retry." + PRESERVED;
    case "storage-permission":
      return (
        "Check this site's Vault storage permissions and retry." + PRESERVED
      );
    case "control-lost":
      return "Another tab controls this adventure. Use that tab and retry.";
    case "cleanup-failed":
      return "The opening failed and the unfinished adventure could not be removed. Archive it from the adventure menu, then retry.";
  }
}

/** Adventure Mode is Oracle-driven, so it cannot start while AI is disabled. */
export const AI_DISABLED_START =
  "AI Disabled is on in Settings. Turn it off to play with Oracle. Your choices are preserved.";

/** Blocks a start before any work: AI Disabled first, then offline. */
export function startPrecheck(env: {
  aiDisabled: boolean;
  online: boolean;
}): string | null {
  if (env.aiDisabled) return AI_DISABLED_START;
  if (!env.online) return "Connect to the internet to start with Oracle.";
  return null;
}

/**
 * What to tell the player after `start()` resolved. Opening failures resolve
 * with a typed cause rather than rejecting, so `null` (clear the draft) is
 * returned only once an opening or pending opening roll is committed.
 */
export function describeStartOutcome(state: {
  errorCause: AdventureStartFailure | null;
  committed: boolean;
  readOnly: boolean;
}): string | null {
  if (state.errorCause) return describeAdventureStartFailure(state.errorCause);
  if (state.committed) return null;
  if (state.readOnly)
    return "Another tab controls this adventure. Use that tab, or take control and retry.";
  return "The adventure was created but its opening scene has not been written yet. Reconnect, then continue it.";
}
