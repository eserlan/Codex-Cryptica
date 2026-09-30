/**
 * The resolver wired to the real provider adaptors and registry. One place, so
 * every route that calls a model resolves operations the same way.
 */
import { callGemini } from "./adaptors/gemini-adaptor";
import { callOpenAi } from "./adaptors/openai-adaptor";
import { getModel, getOperationDefaults } from "./registry";
import { createResolver } from "./resolver";

export interface ProviderEnv {
  GEMINI_API_KEY: string;
  OPENAI_API_KEY?: string;
}

export function createProviderResolver(env: ProviderEnv) {
  return createResolver({
    getModel,
    getOperationDefaults,
    adaptors: {
      gemini: (req, model) => callGemini(req, model, env),
      openai: (req, model) => callOpenAi(req, model, env),
    },
  });
}
