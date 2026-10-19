import { aiClientManager } from "@codex/ai-engine";
import type { PublicGeneratorOutput } from "generator-engine";
import { getSessionContext } from "./session-context";
import {
  generationInputHistoryStore,
  summarizeResolvedInputs,
  formatRecentInputsNote,
} from "./generation-input-history";
import {
  GeneratorAITransport,
  LANGUAGE_GENERATION_CONFIG,
} from "./generator-ai-transport";
import { WorldGenerationService } from "./world-generation";
import { FactionGenerationService } from "./faction-generation";

import type { GeneratorOutput } from "./generator-helpers";

export class GeneratorEngineBase {
  protected transport: GeneratorAITransport;
  protected readonly worldGeneration: WorldGenerationService;
  protected readonly factionGeneration: FactionGenerationService;

  constructor(clientManager = aiClientManager) {
    this.transport = new GeneratorAITransport(clientManager);
    const sharedDependencies = this.createSharedGenerationDependencies();
    this.factionGeneration = new FactionGenerationService(sharedDependencies);
    this.worldGeneration = new WorldGenerationService(sharedDependencies);
  }

  private createSharedGenerationDependencies() {
    return {
      runWithAIFallback: this.runWithAIFallback.bind(this),
      runModel: this.runModel.bind(this),
      getSessionContext,
      recentInputs: generationInputHistoryStore.recent.bind(
        generationInputHistoryStore,
      ),
      recordInputs: generationInputHistoryStore.record.bind(
        generationInputHistoryStore,
      ),
      summarizeResolvedInputs,
      formatRecentInputsNote,
    };
  }

  async generateWithPreview<T>(
    generate: () => Promise<T>,
    onPreview: (text: string) => void,
  ): Promise<T> {
    return this.transport.generateWithPreview(generate, onPreview);
  }

  protected runWithAIFallback(
    useAI: boolean | undefined,
    aiAttempt: () => Promise<PublicGeneratorOutput>,
    local: () => PublicGeneratorOutput,
    signal?: AbortSignal,
  ): Promise<GeneratorOutput> {
    return this.transport.runWithAIFallback(useAI, aiAttempt, local, signal);
  }

  protected runModel(
    systemInstruction: string,
    userMessage: string,
    generationConfig?: typeof LANGUAGE_GENERATION_CONFIG,
    emitPreview = true,
    signal?: AbortSignal,
  ): Promise<string> {
    return this.transport.runModel(
      systemInstruction,
      userMessage,
      generationConfig,
      emitPreview,
      signal,
    );
  }

  protected startChat(systemInstruction: string) {
    return this.transport.startChat(systemInstruction);
  }

  protected sendChatMessage(
    chat: Awaited<ReturnType<GeneratorAITransport["startChat"]>>,
    userMessage: string,
    signal?: AbortSignal,
  ): Promise<string> {
    return this.transport.sendChatMessage(chat, userMessage, signal);
  }
}
