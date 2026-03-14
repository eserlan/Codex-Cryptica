import { base } from "$app/paths";
import { APP_NAME, VERSION } from "$lib/config";
import { HELP_ARTICLES } from "$lib/config/help-content";
import { demoService } from "$lib/services/demo";
import { calendarStore } from "$lib/stores/calendar.svelte";
import { categories } from "$lib/stores/categories.svelte";
import { debugStore } from "$lib/stores/debug.svelte";
import { graph } from "$lib/stores/graph.svelte";
import { helpStore } from "$lib/stores/help.svelte";
import { oracle } from "$lib/stores/oracle.svelte";
import { searchStore } from "$lib/stores/search.svelte";
import { themeStore } from "$lib/stores/theme.svelte";
import { timelineStore } from "$lib/stores/timeline.svelte";
import { uiStore } from "$lib/stores/ui.svelte";
import { vault } from "$lib/stores/vault.svelte";
import { vaultRegistry } from "$lib/stores/vault-registry.svelte";
import { canvasRegistry } from "$lib/stores/canvas-registry.svelte";
import { isEntityVisible } from "schema";

export const initializeShellServices = () => {
  console.log(`[App] ${APP_NAME} v${VERSION} initialized`);

  helpStore.init();
  themeStore.init();
  oracle.init();
};

export const registerProductionServiceWorker = () => {
  if ("serviceWorker" in navigator && !import.meta.env.DEV) {
    navigator.serviceWorker
      .register(`${base}/service-worker.js`)
      .catch((error) => {
        console.warn("Service Worker registration failed:", error);
      });
  }
};

export const createGlobalErrorHandlers = () => {
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
        "ResizeObserver loop completed with undelivered notifications",
      )
    ) {
      return;
    }

    console.error("[Fatal Error]", event);
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

    console.error("[Fatal Rejection]", event);
    uiStore.setGlobalError(
      message || "Unhandled Promise Rejection",
      reason?.stack,
    );
  };

  const handleVaultSwitched = () => {
    calendarStore.init();
  };

  return {
    handleGlobalError,
    handleUnhandledRejection,
    handleVaultSwitched,
  };
};

export const exposeE2EGlobals = () => {
  if (!(import.meta.env.DEV || (window as any).__E2E__)) {
    return;
  }

  (window as any).searchStore = searchStore;
  (window as any).vault = vault;
  (window as any).vaultRegistry = vaultRegistry;
  (window as any).canvasRegistry = canvasRegistry;
  (window as any).graph = graph;
  (window as any).oracle = oracle;
  (window as any).calendarStore = calendarStore;
  (window as any).helpStore = helpStore;
  (window as any).categories = categories;
  (window as any).uiStore = uiStore;
  (window as any).isEntityVisible = isEntityVisible;

  import("$lib/stores/oracle.svelte").then((m) => {
    (window as any).oracle = m.oracle;
  });
  import("$lib/services/ai").then((m) => {
    (window as any).textGeneration = m.textGenerationService;
    (window as any).imageGeneration = m.imageGenerationService;
    (window as any).contextRetrieval = m.contextRetrievalService;
  });
  import("$lib/cloud-bridge/p2p/host-service.svelte").then((m) => {
    (window as any).p2pHostService = m.p2pHost;
  });
  import("$lib/cloud-bridge/p2p/guest-service").then((m) => {
    (window as any).p2pGuestService = m.p2pGuestService;
  });
};

export const bootWorkspaceStores = () => {
  debugStore.log("System booting: Initializing heavy stores...");
  categories.init();
  timelineStore.init();
  graph.init();
  calendarStore.init();

  vault.init().catch((error) => {
    console.error("Vault initialization failed", error);
  });
};

export const openHelpArticleFromHash = (hash: string) => {
  if (!hash || !hash.startsWith("#help/")) {
    return null;
  }

  const articleId = hash.replace("#help/", "");
  if (!articleId) {
    return null;
  }

  const exists = HELP_ARTICLES.some((article) => article.id === articleId);
  if (!exists) {
    return null;
  }

  const timer = setTimeout(() => {
    helpStore.openHelpToArticle(articleId);
  }, 100);

  return () => clearTimeout(timer);
};

export const maybeStartOnboardingOrDemo = (
  isTesting: boolean,
  hasDemoParam: boolean,
) => {
  if (
    !helpStore.hasSeen("initial-onboarding") &&
    !(window as any).DISABLE_ONBOARDING &&
    !hasDemoParam
  ) {
    if (vault.allEntities.length === 0 && !uiStore.isDemoMode && !isTesting) {
      demoService.startDemo("fantasy");
    } else {
      helpStore.startTour("initial-onboarding");
    }
  }
};
