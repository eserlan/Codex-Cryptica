import { browser } from "$app/environment";
import { base } from "$app/paths";
import "../event-registrations";
import { debugStore } from "../../stores/debug.svelte";
import { IS_STAGING } from "../../config";
import { initOracleEventListeners } from "../../listeners/oracle-events";
import { notificationStore } from "$lib/stores/ui/notification.svelte";
import { configureAIEngine } from "@codex/ai-engine";
import { searchService } from "@codex/search-orchestrator";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "$lib/services/performance/browser-performance-capture";
import { resolveTemplateSync } from "../../services/EntityTemplateConstants";
import { registerFlushSavesOnHide } from "./flush-saves-on-hide";
import { vault } from "$lib/stores/vault.svelte";
import {
  cloudBackupStore,
  cloudBackupBrowserStorage,
} from "$lib/stores/cloud-backup.svelte";
import {
  handleVersionSkewReload,
  isVersionSkewError,
} from "../../../hooks.client";

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
  browserPerformanceCapture.start();
  searchService.setPerformanceRecorder(browserPerformanceRecorder);
  configureAIEngine({
    searchService,
    templateResolver: resolveTemplateSync,
  });
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
      const src =
        (event.target as HTMLScriptElement).src ||
        (event.target as HTMLLinkElement).href ||
        "";
      if (src.includes("/_app/immutable/")) {
        console.warn("[VersionSkew] Failed to load immutable asset:", src);
        handleVersionSkewReload();
        return;
      }
      return;
    }

    const message = event.message || "";
    if (isVersionSkewError(event.error || message)) {
      console.warn(
        "[VersionSkew] Dynamic import error detected in handleGlobalError:",
        message,
      );
      handleVersionSkewReload();
      return;
    }

    if (
      message.includes("Script error") ||
      message.includes("Load failed") ||
      message.includes("isHeadless") ||
      message.includes("notify") ||
      message.includes("INTERNET_DISCONNECTED") ||
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes("higher version than the version requested") ||
      message.includes("VersionError") ||
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
    const message = reason?.message || String(reason || "");

    if (isVersionSkewError(reason || message)) {
      console.warn(
        "[VersionSkew] Dynamic import unhandled rejection:",
        message,
      );
      handleVersionSkewReload();
      return;
    }

    if (
      message.includes("Failed to fetch") ||
      message.includes("NetworkError") ||
      message.includes("Load failed") ||
      message.includes("INTERNET_DISCONNECTED") ||
      message.includes("higher version than the version requested") ||
      message.includes("VersionError")
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
      const { timelineStore } = await import("$lib/stores/timeline.svelte");
      await calendarStore.init();
      timelineStore.resetVaultGuard();
      void timelineStore.init();
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

  // Cloud Backup stays inert until a vault opts in; configuring it only wires
  // the dependencies it would need (spec 162).
  cloudBackupStore.configure({
    runtime: {
      baseUrl: import.meta.env.VITE_ORACLE_PROXY_URL || "",
      storage: cloudBackupBrowserStorage(),
      fetch: ((url: string, init?: any) => fetch(url, init)) as never,
    },
    buildPayload: async (_vaultId: string) => ({
      vaultTitle: vault.vaultName || "Vault",
      bundle: {
        schemaVersion: 1,
        entities: Object.values(vault.entities ?? {}),
      },
    }),
    activeVaultId: () => vault.activeVaultId ?? null,
    restore: {
      createVault: (name: string) => vault.createVault(name),
      importEntities: async (_vaultId: string, entities: unknown[]) => {
        await vault.batchCreateEntities(entities as never[]);
      },
    },
  });

  // Read any existing opt-in back so a reload shows the vault's real backup
  // state rather than "off" and a fresh consent prompt (spec 162, FR-020).
  const hydrateCloudBackup = () => {
    const activeVaultId = vault.activeVaultId;
    if (activeVaultId) void cloudBackupStore.hydrate(activeVaultId);
  };
  hydrateCloudBackup();
  window.addEventListener("vault-switched", hydrateCloudBackup);

  // Debounced entity writes are otherwise lost if the app closes inside the
  // debounce window — see #2584.
  const unsubFlushSaves = registerFlushSavesOnHide({
    flushPendingSaves: () => vault.flushPendingSaves(),
  });

  return () => {
    unsubOracle();
    unsubFlushSaves();
    window.removeEventListener("vault-switched", hydrateCloudBackup);
    cloudBackupStore.destroy();
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
            "vttSidebarWidth",
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
            "setVttSidebarWidth",
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
            "vttSidebarWidth",
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
  import("@codex/ai-engine")
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
 * Shortest gap between service worker update checks triggered by the tab
 * regaining focus. Unthrottled, alt-tabbing re-fetches the worker script on
 * every single focus. Production promotes land roughly daily, so noticing one
 * a few minutes late costs nothing — and a client left stale by a promote
 * still self-heals through the version-skew reload in `hooks.client.ts`.
 */
const SERVICE_WORKER_UPDATE_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Registers the service worker if in production.
 */
export function registerServiceWorker(deps?: {
  document?: Document;
  navigator?: Navigator;
  window?: Window;
  isDev?: boolean;
  now?: () => number;
}) {
  const doc = deps?.document ?? document;
  const nav = deps?.navigator ?? navigator;
  const win = deps?.window ?? window;
  const isDev = deps?.isDev ?? import.meta.env.DEV;
  const now = deps?.now ?? Date.now;

  if (!browser || !("serviceWorker" in nav) || isDev) {
    return;
  }

  let isRegistered = false;
  let isRefreshing = false;
  let hadController = !!nav.serviceWorker.controller;

  nav.serviceWorker.addEventListener?.("controllerchange", () => {
    const hasController = !!nav.serviceWorker.controller;
    if (!hadController) {
      hadController = hasController;
      return;
    }
    if (!hasController) {
      hadController = false;
      return;
    }
    if (isRefreshing) return;
    isRefreshing = true;

    void notificationStore
      .confirm({
        title: "App Update Available",
        message:
          "A new version of Codex Cryptica has been installed. Would you like to reload the page now to use the update?",
        confirmLabel: "Reload Now",
        cancelLabel: "Not Now",
      })
      .then((shouldReload) => {
        if (shouldReload) {
          win.location.reload();
        } else {
          isRefreshing = false;
        }
      });
  });

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

    nav.serviceWorker.register(`${base}/service-worker.js`).then(
      (registration) => {
        if (registration && typeof registration.update === "function") {
          // The check on registration is unconditional, so a client that was
          // offline through a promote still discovers it on next launch.
          let lastUpdateCheck = now();
          void registration.update().catch(() => {});

          doc.addEventListener("visibilitychange", () => {
            if (doc.visibilityState !== "visible") return;
            const checkedAt = now();
            if (
              checkedAt - lastUpdateCheck <
              SERVICE_WORKER_UPDATE_INTERVAL_MS
            ) {
              return;
            }
            lastUpdateCheck = checkedAt;
            void registration.update().catch(() => {});
          });
        }
      },
      (error) => {
        console.warn("Service Worker registration failed:", error);
      },
    );
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
