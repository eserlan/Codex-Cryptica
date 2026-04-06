import type { SessionMode } from "$types/vtt";

export function shouldShowInitiativePanel(
  vttEnabled: boolean,
  mode: SessionMode,
) {
  return vttEnabled && mode === "combat";
}
