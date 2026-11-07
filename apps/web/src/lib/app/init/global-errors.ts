import { notificationStore } from "#lib/stores/ui/notification.svelte.js";
import {
  handleVersionSkewReload,
  isVersionSkewError,
} from "../../../hooks.client";

// These failures are transient or expected and are ignored for both event types.
const TRANSIENT_ERRORS = [
  "Failed to fetch",
  "NetworkError",
  "Load failed",
  "INTERNET_DISCONNECTED",
  "higher version than the version requested",
  "VersionError",
];
const RUNTIME_NOISE = [
  "Script error",
  "isHeadless",
  "notify",
  "ResizeObserver loop completed with delivered notifications",
  "ResizeObserver loop completed with undelivered notifications",
];

function matchesMessage(message: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => message.includes(pattern));
}

function reloadVersionSkew(
  error: unknown,
  message: string,
  warning: string,
): boolean {
  if (!isVersionSkewError(error)) return false;
  console.warn(warning, message);
  handleVersionSkewReload();
  return true;
}

/** Resource failures are handled separately from runtime errors. */
function handleResourceError(target: EventTarget | null): boolean {
  if (!(
    target instanceof HTMLScriptElement || target instanceof HTMLLinkElement
  )) {
    return false;
  }
  const src =
    (target as HTMLScriptElement).src || (target as HTMLLinkElement).href || "";
  if (src.includes("/_app/immutable/")) {
    console.warn("[VersionSkew] Failed to load immutable asset:", src);
    handleVersionSkewReload();
  }
  return true;
}

function handleGlobalError(event: ErrorEvent): void {
  if (handleResourceError(event.target)) return;
  const message = event.message || "";
  if (
    reloadVersionSkew(
      event.error || message,
      message,
      "[VersionSkew] Dynamic import error detected in handleGlobalError:",
    )
  )
    return;
  if (
    matchesMessage(message, TRANSIENT_ERRORS) ||
    matchesMessage(message, RUNTIME_NOISE)
  )
    return;

  console.error("[Fatal Error MSG]", event.message, event.error?.stack);
  notificationStore.setGlobalError(event.message, event.error?.stack);
}

function isDefaultExportTypeError(reason: unknown): boolean {
  return (
    reason instanceof TypeError && reason.message.includes("reading 'default'")
  );
}

function getRejectionMessage(reason: PromiseRejectionEvent["reason"]): string {
  return reason?.message || String(reason || "");
}

function handleUnhandledRejection(event: PromiseRejectionEvent): void {
  const reason = event.reason;
  const message = getRejectionMessage(reason);
  if (
    reloadVersionSkew(
      reason || message,
      message,
      "[VersionSkew] Dynamic import unhandled rejection:",
    )
  )
    return;
  if (
    matchesMessage(message, TRANSIENT_ERRORS) ||
    isDefaultExportTypeError(reason)
  )
    return;

  console.error("[Fatal Rejection]", event);
  notificationStore.setGlobalError(
    message || "Unhandled Promise Rejection",
    reason?.stack,
  );
}

export function registerGlobalErrorListeners(): () => void {
  const onError = (event: ErrorEvent) => handleGlobalError(event);
  const onRejection = (event: PromiseRejectionEvent) =>
    handleUnhandledRejection(event);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
