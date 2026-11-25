import { debugStore } from "../../stores/debug.svelte";
import { IS_STAGING } from "../../config";
import { searchService } from "@codex/search-orchestrator";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "#lib/services/performance/browser-performance-capture.js";
import { featureFlags } from "../../stores/feature-flags.svelte";

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
  stores.categories.init();

  // Initialize staging state
  stores.sessionModeStore.isStaging = IS_STAGING;
  featureFlags.applyUrlOverrides();
  void featureFlags.refresh();

  const vaultInitialization = stores.vault.init();
  let graphPreloadStarted = false;
  const preloadGraphForActiveVault = () => {
    if (graphPreloadStarted || !stores.vault.activeVaultId) return;
    graphPreloadStarted = true;
    void import("graph-engine")
      .then(({ preloadGraphCore }) => preloadGraphCore())
      .catch((error: unknown) => {
        debugStore.log(
          "Graph core preload failed; it will load when opened",
          error,
        );
      });
  };
  // Start in parallel when hydration already restored the active vault; if
  // init discovers it, start as soon as that vault becomes available.
  preloadGraphForActiveVault();
  void Promise.resolve(vaultInitialization)
    .then(preloadGraphForActiveVault)
    .catch(() => {});

  Promise.resolve(vaultInitialization).catch((error: any) => {
    console.error("Vault initialization failed", error);
    if (stores.vault.bootDiagnostics?.status !== "failed") {
      stores.vault.bootDiagnostics?.recordFailure("unexpected");
    }
  });

  return true;
}
