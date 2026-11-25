type AIEngineModule = typeof import("@codex/ai-engine");
import { getConsolidatedContext } from "@codex/ai-engine/text-generation-context";
type AIServiceKey =
  | "textGenerationService"
  | "contextRetrievalService"
  | "imageGenerationService";
type AIEngineLoader = () => Promise<AIEngineModule>;

const defaultLoader: AIEngineLoader = async () => {
  const { ensureAiSession } =
    await import("#lib/services/ai/session-bootstrap.js");
  const { loadConfiguredAIEngine } =
    await import("#lib/services/ai/ai-engine-loader.js");
  await ensureAiSession();
  await loadConfiguredAIEngine();
  return import("@codex/ai-engine");
};

function createLazyService<K extends AIServiceKey>(
  serviceKey: K,
  loadModule: AIEngineLoader,
): AIEngineModule[K] {
  return new Proxy(
    {},
    {
      get: (_target, property) => {
        if (typeof property === "symbol" || property === "then")
          return undefined;
        return (...args: unknown[]) =>
          loadModule().then((module) => {
            const service = module[serviceKey] as unknown as Record<
              PropertyKey,
              unknown
            >;
            const method = service[property];
            if (typeof method !== "function") {
              throw new Error(
                `AI service method ${String(property)} is unavailable.`,
              );
            }
            return Reflect.apply(method, service, args);
          });
      },
    },
  ) as AIEngineModule[K];
}

export function createLazyOracleAIServices(loadModule = defaultLoader) {
  const textGenerationService = createLazyService(
    "textGenerationService",
    loadModule,
  );
  const imageGenerationService = createLazyService(
    "imageGenerationService",
    loadModule,
  );
  const contextRetrievalService = {
    getConsolidatedContext,
    retrieveContext: (
      ...args: Parameters<
        AIEngineModule["contextRetrievalService"]["retrieveContext"]
      >
    ) =>
      loadModule().then(({ contextRetrievalService }) =>
        contextRetrievalService.retrieveContext(...args),
      ),
    clearStyleCache: () =>
      loadModule().then(({ contextRetrievalService }) =>
        contextRetrievalService.clearStyleCache(),
      ),
  } as unknown as AIEngineModule["contextRetrievalService"];

  return {
    textGenerationService,
    contextRetrievalService,
    imageGenerationService,
  };
}

export const lazyOracleAIServices = createLazyOracleAIServices();
