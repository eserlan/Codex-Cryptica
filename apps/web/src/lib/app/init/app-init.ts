import { browser } from "$app/environment";
import { base } from "$app/paths";
import "../event-registrations";
import { debugStore } from "../../stores/debug.svelte";
import { IS_STAGING } from "../../config";
import { initOracleEventListeners } from "../../listeners/oracle-events";
import { notificationStore } from "$lib/stores/ui/notification.svelte";

/**
 * Core system bootstrapping.
 * Initializes all heavy stores required for the workspace.
 */
export function bootSystem(stores: {
  categories: any;
  vault: any;
  sessionModeStore: any;
}): boolean {
  debugStore.log("System booting: Initializing core stores...");
  stores.categories.init();

  // Initialize staging state
  stores.sessionModeStore.isStaging = IS_STAGING;

  stores.vault.init().catch((error: any) => {
    console.error("Vault initialization failed", error);
  });

  return true;
}

/**
 * Sets up global error and rejection handlers.
 * Returns a cleanup function.
 */
export function initializeGlobalListeners(_calendarStore?: any) {
  if (!browser) return () => {};

  // Initialize Oracle action listeners
  const unsubOracle: () => void = initOracleEventListeners();

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
    notificationStore.setGlobalError(event.message, event.error?.stack);
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
    notificationStore.setGlobalError(
      message || "Unhandled Promise Rejection",
      reason?.stack,
    );
  };

  const handleVaultSwitched = async () => {
    try {
      const { calendarStore } = await import("$lib/stores/calendar.svelte");
      calendarStore.init();
    } catch (err) {
      console.error(
        "[AppInit] Failed to initialize calendar store on vault switch:",
        err,
      );
    }
  };

  window.addEventListener("error", handleGlobalError);
  window.addEventListener("unhandledrejection", handleUnhandledRejection);
  window.addEventListener("vault-switched", handleVaultSwitched);

  return () => {
    unsubOracle();
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
  canvasRegistry?: any;
  graph?: any;
  oracle?: any;
  calendarStore?: any;
  helpStore: any;
  categories: any;
  onboardingStore?: any;
  sessionModeStore?: any;
  notificationStore?: any;
  layoutUIStore?: any;
  modalUIStore?: any;
  discoveryPolicyStore?: any;
  connectionModeStore?: any;
  explorerUIStore?: any;
  isEntityVisible: any;
  eventBus?: any;
}) {
  if (!browser) return;

  const isSpecialEnv =
    import.meta.env.DEV || import.meta.env.VITE_STAGING === "true";

  if (!isSpecialEnv) return;

  debugStore.log("[WindowGlobals] Attaching:", Object.keys(context));
  Object.assign(window, context);
  (window as any).codexUI = {
    onboarding: context.onboardingStore,
    session: context.sessionModeStore,
    notification: context.notificationStore,
    layout: context.layoutUIStore,
    modal: context.modalUIStore,
    discovery: context.discoveryPolicyStore,
    connection: context.connectionModeStore,
    explorer: context.explorerUIStore,
  };

  // Backwards compatibility layer for legacy E2E tests accessing window.uiStore
  (window as any).uiStore = new Proxy(
    {},
    {
      get(_target, prop) {
        if (typeof prop !== "string") return undefined;

        // OnboardingStore properties
        if (
          [
            "dismissedWorldPage",
            "dismissedLandingPage",
            "skipWelcomeScreen",
            "lastSeenVersion",
            "showChangelog",
            "isLandingPageVisible",
          ].includes(prop)
        ) {
          return context.onboardingStore?.[prop];
        }

        // SessionModeStore properties
        if (
          [
            "isDemoMode",
            "sharedMode",
            "isGuestMode",
            "guestUsername",
            "setGuestUsername",
          ].includes(prop)
        ) {
          const val = context.sessionModeStore?.[prop];
          if (typeof val === "function") {
            return val.bind(context.sessionModeStore);
          }
          return val;
        }

        // LayoutUIStore properties
        if (
          [
            "leftSidebarWidth",
            "rightSidebarWidth",
            "leftSidebarOpen",
            "activeSidebarTool",
            "mainViewMode",
            "focusedEntityId",
            "isMobile",
            "vttSidebarCollapsed",
            "vttChatSidebarCollapsed",
            "vttEntityListCollapsed",
            "findNodeCounter",
            "lastSelectedNodePosition",
            "toggleSidebarTool",
            "closeSidebar",
            "setLeftSidebarWidth",
            "setRightSidebarWidth",
            "toggleVttSidebar",
            "toggleVttChatSidebar",
            "toggleVttEntityList",
            "findInGraph",
            "setLastSelectedNodePosition",
          ].includes(prop)
        ) {
          const val = context.layoutUIStore?.[prop];
          if (typeof val === "function") {
            return val.bind(context.layoutUIStore);
          }
          return val;
        }

        // ModalUIStore properties
        if (
          [
            "showSettings",
            "activeTab",
            "readModeNodeId",
            "zenModeEntityId",
            "zenModeActiveTab",
            "showZenMode",
            "openZenMode",
            "closeZenMode",
            "openReadMode",
            "closeReadMode",
          ].includes(prop)
        ) {
          const val = context.modalUIStore?.[prop];
          if (typeof val === "function") {
            return val.bind(context.modalUIStore);
          }
          return val;
        }

        // DiscoveryPolicyStore properties
        if (
          ["showUnindexedNotification", "acknowledgedUnindexed"].includes(prop)
        ) {
          return context.discoveryPolicyStore?.[prop];
        }

        // ConnectionModeStore properties
        if (["connectionMode"].includes(prop)) {
          return context.connectionModeStore?.[prop];
        }

        // ExplorerUIStore properties
        if (
          ["selectedLabels", "expandedCategories", "searchQuery"].includes(prop)
        ) {
          return context.explorerUIStore?.[prop];
        }

        return undefined;
      },
      set(_target, prop, value) {
        if (typeof prop !== "string") return false;

        // OnboardingStore properties
        if (
          [
            "dismissedWorldPage",
            "dismissedLandingPage",
            "skipWelcomeScreen",
            "lastSeenVersion",
            "showChangelog",
            "isLandingPageVisible",
          ].includes(prop)
        ) {
          if (context.onboardingStore) {
            context.onboardingStore[prop] = value;
            return true;
          }
          return false;
        }

        // SessionModeStore properties
        if (
          ["isDemoMode", "sharedMode", "isGuestMode", "guestUsername"].includes(
            prop,
          )
        ) {
          if (context.sessionModeStore) {
            context.sessionModeStore[prop] = value;
            return true;
          }
          return false;
        }

        // LayoutUIStore properties
        if (
          [
            "leftSidebarWidth",
            "rightSidebarWidth",
            "leftSidebarOpen",
            "activeSidebarTool",
            "mainViewMode",
            "focusedEntityId",
            "isMobile",
            "vttSidebarCollapsed",
            "vttChatSidebarCollapsed",
            "vttEntityListCollapsed",
            "findNodeCounter",
            "lastSelectedNodePosition",
          ].includes(prop)
        ) {
          if (context.layoutUIStore) {
            context.layoutUIStore[prop] = value;
            return true;
          }
          return false;
        }

        // ModalUIStore properties
        if (
          [
            "showSettings",
            "activeTab",
            "readModeNodeId",
            "zenModeEntityId",
            "zenModeActiveTab",
            "showZenMode",
          ].includes(prop)
        ) {
          if (context.modalUIStore) {
            context.modalUIStore[prop] = value;
            return true;
          }
          return false;
        }

        // DiscoveryPolicyStore properties
        if (
          ["showUnindexedNotification", "acknowledgedUnindexed"].includes(prop)
        ) {
          if (context.discoveryPolicyStore) {
            context.discoveryPolicyStore[prop] = value;
            return true;
          }
          return false;
        }

        // ConnectionModeStore properties
        if (["connectionMode"].includes(prop)) {
          if (context.connectionModeStore) {
            context.connectionModeStore[prop] = value;
            return true;
          }
          return false;
        }

        // ExplorerUIStore properties
        if (
          ["selectedLabels", "expandedCategories", "searchQuery"].includes(prop)
        ) {
          if (context.explorerUIStore) {
            context.explorerUIStore[prop] = value;
            return true;
          }
          return false;
        }

        return false;
      },
    },
  );

  // Expose revisionService for DEV/staging E2E test access
  if (import.meta.env.DEV || import.meta.env.VITE_STAGING === "true") {
    import("../../services/RevisionService.svelte")
      .then((m) => {
        if (m?.revisionService)
          (window as any).revisionService = m.revisionService;
      })
      .catch((e) =>
        debugStore.warn("Failed to attach revisionService to window", e),
      );

    import("../../services/generators/generator-session-manager")
      .then((m) => {
        if (m?.generatorSessionManager)
          (window as any).generatorSessionManager = m.generatorSessionManager;
      })
      .catch((e) =>
        debugStore.warn(
          "Failed to attach generatorSessionManager to window",
          e,
        ),
      );
  }

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
export function registerServiceWorker(deps?: {
  document?: Document;
  navigator?: Navigator;
  window?: Window;
  isDev?: boolean;
}) {
  const doc = deps?.document ?? document;
  const nav = deps?.navigator ?? navigator;
  const win = deps?.window ?? window;
  const isDev = deps?.isDev ?? import.meta.env.DEV;

  if (!browser || !("serviceWorker" in nav) || isDev) {
    return;
  }

  let isRegistered = false;

  const cleanup = () => {
    win.removeEventListener("load", tryRegister);
    win.removeEventListener("pageshow", tryRegister);
    doc.removeEventListener("visibilitychange", tryRegister);
  };

  const tryRegister = () => {
    const isPrerendering =
      String(doc.visibilityState) === "prerender" ||
      (
        doc as Document & {
          prerendering?: boolean;
        }
      ).prerendering === true;

    if (isRegistered || doc.readyState !== "complete" || isPrerendering) {
      return;
    }

    isRegistered = true;
    cleanup();

    nav.serviceWorker.register(`${base}/service-worker.js`).catch((error) => {
      console.warn("Service Worker registration failed:", error);
    });
  };

  if (doc.readyState === "complete") {
    tryRegister();
    if (isRegistered) {
      return;
    }
  }

  win.addEventListener("load", tryRegister, { once: true });
  win.addEventListener("pageshow", tryRegister);
  doc.addEventListener("visibilitychange", tryRegister);
}
