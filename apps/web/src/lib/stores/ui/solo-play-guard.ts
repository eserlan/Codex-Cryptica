import { SHARED_SOLO_NOTE, SOLO_SHARED_NOTE } from "../solo-session.svelte";

export { SHARED_SOLO_NOTE, SOLO_SHARED_NOTE };

export interface SoloPlayGuardDeps {
  soloActive(): boolean;
  isSharedPlayOn(): boolean;
  sharedMode(): boolean;
  setSharedMode(on: boolean): void;
  openShare(): void;
  notify(message: string): void;
}

/**
 * The one place that decides whether shared play may start during a solo
 * session, and whether a solo session may start during shared play.
 * Leaving shared play is always allowed.
 */
export function createSoloPlayGuard(deps: SoloPlayGuardDeps) {
  const sharedPlayBlockedReason = (): string | null =>
    deps.soloActive() ? SOLO_SHARED_NOTE : null;

  const soloStartBlockedReason = (): string | null =>
    deps.isSharedPlayOn() ? SHARED_SOLO_NOTE : null;

  /** Turns shared mode on or off. Returns whether the mode changed. */
  const toggleSharedMode = (): boolean => {
    if (!deps.sharedMode()) {
      const reason = sharedPlayBlockedReason();
      if (reason) return false;
    }
    deps.setSharedMode(!deps.sharedMode());
    return true;
  };

  /** Opens Share, which is how the vault starts hosting. Returns whether it opened. */
  const requestShare = (): boolean => {
    const reason = sharedPlayBlockedReason();
    if (reason) {
      deps.notify(reason);
      return false;
    }
    deps.openShare();
    return true;
  };

  return {
    sharedPlayBlockedReason,
    soloStartBlockedReason,
    toggleSharedMode,
    requestShare,
  };
}

export type SoloPlayGuard = ReturnType<typeof createSoloPlayGuard>;
