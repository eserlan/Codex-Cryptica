import { browser } from "$app/environment";
import { base } from "$app/paths";
import { debugStore } from "../../stores/debug.svelte";
import { IS_STAGING } from "../../config";

/**
 * Core system bootstrapping.
 * Initializes all heavy stores required for the workspace.
 */
export function bootSystem(stores: {
  categories: any;
  timeline: any;
  graph: any;
  calendar: any;
  vault: any;
  uiStore: any;
}): boolean {
  debugStore.log("System booting: Initializing heavy stores...");
  stores.categories.init();
  stores.timeline.init();
  stores.graph.init();
  stores.calendar.init();

  // Initialize staging state
  stores.uiStore.isStaging = IS_STAGING;

  stores.vault.init().catch((error: any) => {
    console.error("Vault initialization failed", error);
  });

  return true;
}

/**
 * Sets up global error and rejection handlers.
 * Returns a cleanup function.
 */
export function initializeGlobalListeners(uiStore: any, calendarStore: any) {
  if (!browser) return () => {};

  const handleGlobalError = (event: ErrorEvent) => {
    if (
      event.target instanceof HTMLScriptElement ||
      event.target instanceof HTMLLinkElement
    ) {
      return;
    }

    const message = event.message || "";
    if (
      message.includes("Script error") ||
      message.includes("Load failed") ||
      message.includes("isHeadless") ||
      message.includes("notify") ||
      message.includes("INTERNET_DISCONNECTED") ||
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes(
        "ResizeObserver loop completed with delivered notifications",
      ) ||
      message.includes(
        "ResizeObserver loop completed with undelivered notifications",
      )
    ) {
      return;
    }

    console.error("[Fatal Error MSG]", event.message, event.error?.stack);
    uiStore.setGlobalError(event.message, event.error?.stack);
  };

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = reason?.message || "";

    if (
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes("Load failed") ||
      message.includes("INTERNET_DISCONNECTED")
    ) {
      return;
    }

    if (
      reason instanceof TypeError &&
      reason.message.includes("reading 'default'")
    ) {
      return;
    }

    console.error("[Fatal Rejection]", event);
    uiStore.setGlobalError(
      message || "Unhandled Promise Rejection",
      reason?.stack,
    );
  };

  const handleVaultSwitched = () => {
    calendarStore.init();
  };

  window.addEventListener("error", handleGlobalError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  window.addEventListener("vault-switched", handleVaultSwitched);

  return () => {
    window.removeEventListener("error", handleGlobalError);
    window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    window.removeEventListener("vault-switched", handleVaultSwitched);
  };
}

/**
 * Attaches core stores and services to window for debugging/E2E.
 */
export function setupWindowGlobals(context: {
  searchStore: any;
  vault: any;
  vaultRegistry: any;
  canvasRegistry: any;
  graph: any;
  oracle: any;
  calendarStore: any;
  helpStore: any;
  categories: any;
  uiStore: any;
  isEntityVisible: any;
}) {
  if (!browser) return;

  const isSpecialEnv =
    import.meta.env.DEV ||
    (typeof window !== "undefined" && (window as any).__E2E__) ||
    import.meta.env.VITE_STAGING === "true";

  if (!isSpecialEnv) return;

  console.log("[WindowGlobals] Attaching:", Object.keys(context));
  Object.assign(window, context);

  // Lazy-load dynamic AI services if not already present
  import("../../services/ai")
    .then((m) => {
      if (m) {
        (window as any).textGeneration = m.textGenerationService;
        (window as any).imageGeneration = m.imageGenerationService;
        (window as any).contextRetrieval = m.contextRetrievalService;
      }
    })
    .catch((e) => debugStore.warn("Failed to attach AI services to window", e));

  import("../../cloud-bridge/p2p/host-service.svelte")
    .then((m) => {
      if (m?.p2pHost) (window as any).p2pHostService = m.p2pHost;
    })
    .catch((e) =>
      debugStore.warn("Failed to attach p2p host service to window", e),
    );

  import("../../cloud-bridge/p2p/guest-service")
    .then((m) => {
      if (m?.p2pGuestService)
        (window as any).p2pGuestService = m.p2pGuestService;
    })
    .catch((e) =>
      debugStore.warn("Failed to attach p2p guest service to window", e),
    );
}

/**
 * Registers the service worker if in production.
 */
export function registerServiceWorker() {
  if (browser && "serviceWorker" in navigator && !import.meta.env.DEV) {
    navigator.serviceWorker
      .register(`${base}/service-worker.js`)
      .catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });
  }
}
