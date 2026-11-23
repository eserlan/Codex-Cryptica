import { searchService } from "@codex/search-orchestrator";
import { entityTemplateStore } from "#lib/stores/entity-templates/entity-template-store.svelte.js";

type AIEngineConfig = typeof import("@codex/ai-engine/config");
type AIEngineLoader = () => Promise<AIEngineConfig>;

let enginePromise: Promise<AIEngineConfig> | undefined;

/** Loads and configures the shared AI engine once, retrying after load failure. */
export function loadConfiguredAIEngine(
  loadEngine: AIEngineLoader = async () => import("@codex/ai-engine/config"),
): Promise<AIEngineConfig> {
  if (!enginePromise) {
    enginePromise = loadEngine()
      .then((engine) => {
        engine.configureAIEngine({
          searchService,
          templateResolver: (type, themeId) =>
            entityTemplateStore.resolveSync(type, themeId),
        });
        return engine;
      })
      .catch((error: unknown) => {
        enginePromise = undefined;
        throw error;
      });
  }
  return enginePromise;
}
