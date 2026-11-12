import { browser } from "$app/env";
import { resolve } from "$app/paths";
import { notificationStore } from "#lib/stores/ui/notification.svelte.js";

/**
 * Shortest gap between service worker update checks triggered by the tab
 * regaining focus. Unthrottled, alt-tabbing re-fetches the worker script on
 * every single focus. Production promotes land roughly daily, so noticing one
 * a few minutes late costs nothing — and a client left stale by a promote
 * still self-heals through the version-skew reload in `hooks.client.ts`.
 */
const SERVICE_WORKER_UPDATE_INTERVAL_MS = 15 * 60 * 1000;

export interface VaultServiceWorkerSession {
  setVaultSessionActive(active: boolean): void;
  destroy(): void;
}

/** Builds the smallest same-origin shell needed to reopen the current vault route. */
export function collectVaultShellUrls(
  currentUrl: string,
  resourceEntries: readonly Pick<PerformanceEntry, "name">[],
): string[] {
  try {
    const documentUrl = new URL(currentUrl);
    documentUrl.hash = "";
    const urls = new Set<string>([documentUrl.href]);

    for (const entry of resourceEntries) {
      const resourceUrl = new URL(entry.name, documentUrl.origin);
      resourceUrl.hash = "";
      if (
        resourceUrl.origin === documentUrl.origin &&
        resourceUrl.pathname.includes("/_app/immutable/")
      ) {
        urls.add(resourceUrl.href);
      }
    }

    return [...urls];
  } catch {
    return [];
  }
}

function isDocumentPrerendering(doc: Document): boolean {
  return (
    String(doc.visibilityState) === "prerender" ||
    (doc as Document & { prerendering?: boolean }).prerendering === true
  );
}

function handleRegistrationFailure(error: unknown): void {
  // Document detachment, reload mid-flight, or sandboxed environments throw
  // InvalidStateError; ignore gracefully without logging noisy errors.
  if (
    error instanceof Error &&
    (error.name === "InvalidStateError" ||
      error.message?.includes("invalid state"))
  ) {
    return;
  }
  console.warn("Service Worker registration failed:", error);
}

function registerUpdateChecks(
  registration: ServiceWorkerRegistration | undefined,
  doc: Document,
  now: () => number,
): EventListener | undefined {
  if (!registration || typeof registration.update !== "function") return;
  // Check unconditionally on registration so clients offline during a promote
  // discover the update on their next launch.
  let lastUpdateCheck = now();
  void registration.update().catch(() => {});

  const onVisible: EventListener = () => {
    if (doc.visibilityState !== "visible") return;
    const checkedAt = now();
    if (checkedAt - lastUpdateCheck < SERVICE_WORKER_UPDATE_INTERVAL_MS) return;
    lastUpdateCheck = checkedAt;
    void registration.update().catch(() => {});
  };
  doc.addEventListener("visibilitychange", onVisible);
  return onVisible;
}

/**
 * Registers the service worker if in production.
 */
export function registerServiceWorker(deps?: {
  document?: Document;
  navigator?: Navigator;
  window?: Window;
  performance?: Pick<Performance, "getEntriesByType">;
  isDev?: boolean;
  now?: () => number;
}): VaultServiceWorkerSession {
  const doc = deps?.document ?? document;
  const nav = deps?.navigator ?? navigator;
  const win = deps?.window ?? window;
  const performanceApi = deps?.performance ?? win.performance;
  const isDev = deps?.isDev ?? import.meta.env.DEV;
  const now = deps?.now ?? Date.now;
  const serviceWorkerUrl = `${resolve("/(app)").replace(/\/+$/, "")}/service-worker.js`;

  let isVaultSessionActive = false;
  let registration: ServiceWorkerRegistration | undefined;
  let isDestroyed = false;
  let updateVisibilityHandler: EventListener | undefined;

  const syncVaultSession = () => {
    if (isDestroyed || !("serviceWorker" in nav)) return;
    const worker = registration?.active ?? nav.serviceWorker.controller;
    if (!worker || typeof worker.postMessage !== "function") return;

    const urls = isVaultSessionActive
      ? collectVaultShellUrls(
          win.location.href,
          performanceApi?.getEntriesByType("resource") ?? [],
        )
      : [];
    worker.postMessage({
      type: "VAULT_CACHE_SESSION",
      active: isVaultSessionActive,
      urls,
    });
  };

  const session: VaultServiceWorkerSession = {
    setVaultSessionActive(active) {
      isVaultSessionActive = active;
      syncVaultSession();
    },
    destroy() {
      isVaultSessionActive = false;
      syncVaultSession();
      isDestroyed = true;
    },
  };

  if (!browser || !("serviceWorker" in nav) || isDev) {
    return session;
  }

  let isRegistered = false;
  let isRefreshing = false;
  let hadController = !!nav.serviceWorker.controller;

  const handleControllerChange = () => {
    syncVaultSession();
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
  };
  nav.serviceWorker.addEventListener?.(
    "controllerchange",
    handleControllerChange,
  );

  const cleanup = () => {
    win.removeEventListener("load", tryRegister);
    win.removeEventListener("pageshow", tryRegister);
    doc.removeEventListener("visibilitychange", tryRegister);
  };

  const tryRegister = () => {
    if (
      isRegistered ||
      doc.readyState !== "complete" ||
      isDocumentPrerendering(doc)
    ) {
      return;
    }

    isRegistered = true;
    cleanup();

    nav.serviceWorker.register(serviceWorkerUrl).then((registeredWorker) => {
      registration = registeredWorker;
      if (isDestroyed) return;
      syncVaultSession();
      updateVisibilityHandler = registerUpdateChecks(
        registeredWorker,
        doc,
        now,
      );
    }, handleRegistrationFailure);
  };

  if (doc.readyState === "complete") {
    tryRegister();
  }

  if (!isRegistered) {
    win.addEventListener("load", tryRegister, { once: true });
    win.addEventListener("pageshow", tryRegister);
    doc.addEventListener("visibilitychange", tryRegister);
  }

  const destroySession = session.destroy;
  session.destroy = () => {
    destroySession();
    cleanup();
    nav.serviceWorker.removeEventListener?.(
      "controllerchange",
      handleControllerChange,
    );
    if (updateVisibilityHandler) {
      doc.removeEventListener("visibilitychange", updateVisibilityHandler);
    }
  };

  return session;
}
