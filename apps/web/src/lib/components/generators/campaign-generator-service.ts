import {
  CampaignGeneratorService,
  adventureStatsLog,
  heistStatsLog,
  tomeStatsLog,
  type CampaignGeneratorServiceDeps,
} from "generator-engine";
import { vault } from "#lib/stores/vault.svelte.js";
import { aiGeneratorGateway } from "#lib/services/generators/ai-generator-gateway.js";
import { generatorSessionManager } from "#lib/services/generators/generator-session-manager.js";
import { logDungeonStagedStats } from "#lib/services/generators/generator-staged-diagnostics.js";

/** Adapt app persistence, interaction tracking and diagnostics to the engine. */
export function createCampaignGeneratorService(
  getAIPolicy: () => CampaignGeneratorServiceDeps["aiPolicy"],
  deps = { vault, aiGeneratorGateway, generatorSessionManager },
): CampaignGeneratorService {
  return new CampaignGeneratorService({
    vault: {
      canWrite: () => !deps.vault.isGuest,
      createEntity: (type, title, data) =>
        deps.vault.createEntity(type, title, data),
      addConnection: (src, tgt, rel) => deps.vault.addConnection(src, tgt, rel),
    },
    aiGateway: deps.aiGeneratorGateway,
    onInteractionResult(result) {
      if (result.interactionId)
        deps.generatorSessionManager.commitInteraction(
          result.interactionId,
          result.replayed,
        );
    },
    onPromptMetrics(metrics) {
      deps.generatorSessionManager.recordPromptMetrics(metrics);
    },
    onDungeonStagedStats: logDungeonStagedStats,
    onAdventureStagedStats(stats) {
      if (import.meta.env.DEV)
        console.debug(
          "[Generator] staged adventure run",
          adventureStatsLog(stats),
        );
    },
    onHeistStagedStats(stats) {
      if (import.meta.env.DEV)
        console.debug("[Generator] staged heist run", heistStatsLog(stats));
    },
    onTomeStagedStats(stats) {
      if (import.meta.env.DEV)
        console.debug("[Generator] staged tome run", tomeStatsLog(stats));
    },
    get aiPolicy() {
      return getAIPolicy();
    },
  });
}
