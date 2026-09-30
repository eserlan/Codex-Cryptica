/**
 * Build-time gate for the contextual help assistant spike (#3427).
 *
 * Off unless `VITE_HELP_ASSISTANT` is exactly "true". There is no general
 * feature-flag system in the app; staging sets this, production does not.
 *
 * Development builds also honour a local switch, so a test or a developer can
 * turn it on for one browser without rebuilding. Production builds ignore it.
 * Read at call time so tests can stub the environment.
 */
export const HELP_ASSISTANT_DEV_SWITCH = "codex_help_assistant";

function devSwitchOn(): boolean {
  if (!import.meta.env?.DEV || typeof localStorage === "undefined")
    return false;
  try {
    return localStorage.getItem(HELP_ASSISTANT_DEV_SWITCH) === "true";
  } catch {
    return false;
  }
}

export function isHelpAssistantEnabled(): boolean {
  return import.meta.env?.VITE_HELP_ASSISTANT === "true" || devSwitchOn();
}
