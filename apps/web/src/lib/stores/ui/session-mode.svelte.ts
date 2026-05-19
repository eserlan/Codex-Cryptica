export class SessionModeStore {
  isStaging = $state(false);
  isDemoMode = $state(false);
  activeDemoTheme = $state<string | null>(null);
  hasPromptedSave = $state(false);
  wasConverted = $state(false);
  sharedMode = $state(false);
  isGuestMode = $state(false);
  guestUsername = $state<string | null>(null);

  setGuestUsername(username: string | null) {
    this.guestUsername = username;
  }
}

const KEY = "__codex_session_mode_store__";
export const sessionModeStore: SessionModeStore =
  (globalThis as any)[KEY] ??
  ((globalThis as any)[KEY] = new SessionModeStore());
