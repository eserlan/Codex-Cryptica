import type { HandleClientError } from "@sveltejs/kit";

const RELOAD_KEY = "codex_version_skew_reload_ts";
const RELOAD_DEBOUNCE_MS = 10000;

/**
 * Safely triggers a page reload when dynamic module version skew or missing chunk 404 is detected.
 * Uses sessionStorage to throttle reloads to at most once per 10 seconds to prevent infinite reload loops.
 */
export function handleVersionSkewReload(targetWindow?: Window): boolean {
  const win =
    targetWindow ?? (typeof window !== "undefined" ? window : undefined);
  if (!win || !win.sessionStorage || !win.location) return false;

  const now = Date.now();
  const lastReloadStr = win.sessionStorage.getItem(RELOAD_KEY);
  const lastReload = lastReloadStr ? Number(lastReloadStr) : 0;

  if (now - lastReload > RELOAD_DEBOUNCE_MS) {
    try {
      win.sessionStorage.setItem(RELOAD_KEY, String(now));
    } catch {
      // Ignore storage errors (e.g. private browsing storage quota)
    }
    win.location.reload();
    return true;
  }

  return false;
}

/**
 * Checks whether an error or error message represents a client-side version skew / missing JS chunk load failure.
 */
export function isVersionSkewError(
  error: unknown,
  urlPath: string = "",
): boolean {
  const errObj = error as { message?: string; stack?: string } | null;
  const message =
    typeof error === "string" ? error : errObj?.message || String(error || "");

  const containsModuleError =
    message.includes("Failed to fetch dynamically imported module") ||
    message.includes("Importing a module script failed") ||
    message.includes("error loading dynamically imported module") ||
    message.includes("Unexpected token '<'");

  const isImmutableAssetError =
    (message.includes("404") || message.includes("Load failed")) &&
    (urlPath.includes("/_app/immutable/") || urlPath.endsWith(".js"));

  return containsModuleError || isImmutableAssetError;
}

export const handleError: HandleClientError = ({ error, event, message }) => {
  const urlPath = event?.url?.pathname || "";

  if (isVersionSkewError(error, urlPath)) {
    console.warn(
      "[VersionSkew] Dynamic module load error detected in handleError. Triggering reload...",
      error,
    );
    if (handleVersionSkewReload()) {
      return {
        message: "A new version of the app is available. Reloading page...",
      };
    }
  }

  console.error("[Client Error]", error, event);
  return {
    message: message || "An unexpected error occurred.",
  };
};
