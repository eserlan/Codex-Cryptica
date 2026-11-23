type AIClientManager = (typeof import("@codex/ai-engine"))["aiClientManager"];
import { loadConfiguredAIEngine } from "#lib/services/ai/ai-engine-loader.js";
import { ensureAiSession } from "#lib/services/ai/session-bootstrap.js";

export function createLazyAIClientManager(
  loadManager: () => Promise<AIClientManager> = async () => {
    await ensureAiSession();
    await loadConfiguredAIEngine();
    return (await import("@codex/ai-engine/client-manager")).aiClientManager;
  },
) {
  return {
    async getModel(...args: Parameters<AIClientManager["getModel"]>) {
      const manager = await loadManager();
      return manager.getModel(...args);
    },
  };
}
