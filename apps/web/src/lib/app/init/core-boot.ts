import { debugStore } from "../../stores/debug.svelte";
import { IS_STAGING } from "../../config";
import { configureAIEngine } from "@codex/ai-engine";
import { preloadGraphCore } from "graph-engine";
import { searchService } from "@codex/search-orchestrator";
import {
  browserPerformanceCapture,
  browserPerformanceRecorder,
} from "#lib/services/performance/browser-performance-capture.js";
import { entityTemplateStore } from "../../stores/entity-templates/entity-template-store.svelte";
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
  // Fetched alongside the vault load instead of after it; a failure here is
  // retried when the graph is actually created.
  void preloadGraphCore().catch(() => {});
  searchService.setPerformanceRecorder(browserPerformanceRecorder);
  configureAIEngine({
    searchService,
    templateResolver: (type, themeId) =>
      entityTemplateStore.resolveSync(type, themeId),
  });
  stores.categories.init();

  // Initialize staging state
  stores.sessionModeStore.isStaging = IS_STAGING;
  featureFlags.applyUrlOverrides();
  void featureFlags.refresh();

  stores.vault.init().catch((error: any) => {
    console.error("Vault initialization failed", error);
    if (stores.vault.bootDiagnostics?.status !== "failed") {
      stores.vault.bootDiagnostics?.recordFailure("unexpected");
    }
  });

  return true;
}
