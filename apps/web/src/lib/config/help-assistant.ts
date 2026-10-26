/**
 * Gate for the contextual help assistant spike (#3427).
 *
 * On when any of these holds, otherwise off:
 * - `VITE_HELP_ASSISTANT` is exactly "true" (a build that wants it everywhere);
 * - the page is served from staging, detected from the hostname at run time;
 * - a development build has the local switch set.
 *
 * Staging is detected at run time, not build time, because the web build that
 * runs on staging is promoted to production as the same artifact. A build-time
 * flag set for staging would switch the assistant on in production as well.
 * There is no general feature-flag system in the app.
 */
import { IS_STAGING } from "$lib/config";

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
  return (
    import.meta.env?.VITE_HELP_ASSISTANT === "true" ||
    IS_STAGING ||
    devSwitchOn()
  );
}
