import {
  applyRefinementProposal,
  buildRefinementPrompt,
  normalizeRefinementDocument,
  parseRefinementResponse,
  type RefinableSource,
  type RefinementDocument,
  type RefinementProposal,
} from "generator-engine";
import {
  GeneratorAITransport,
  LANGUAGE_GENERATION_CONFIG,
} from "$lib/services/seo/generator-ai-transport";

export type RefinementRunner = (
  source: RefinementDocument,
  instructions: string,
) => Promise<RefinementProposal>;

const REFINEMENT_SYSTEM_INSTRUCTION =
  "You are a careful RPG writing editor. Return only the JSON object requested by the user. Never include commentary outside that object.";

function defaultRunner(transport: GeneratorAITransport): RefinementRunner {
  return async (source, instructions) => {
    const raw = await transport.runModel(
      REFINEMENT_SYSTEM_INSTRUCTION,
      buildRefinementPrompt(source, instructions),
      LANGUAGE_GENERATION_CONFIG,
    );
    return parseRefinementResponse(raw);
  };
}

/**
 * Shared, vault-independent refinement loop used by public generators and the
 * Session Hub. Repeated passes always refine the latest accepted proposal.
 */
export class GeneratorRefinementService {
  source = $state<RefinementDocument | null>(null);
  proposal = $state<RefinementDocument | null>(null);
  isRefining = $state(false);
  error = $state<string | null>(null);
  iteration = $state(0);
  lastAcceptedIteration = $state(0);

  private readonly runner: RefinementRunner;
  private requestVersion = 0;

  constructor(
    runner?: RefinementRunner,
    transport: GeneratorAITransport = new GeneratorAITransport(),
  ) {
    this.runner = runner ?? defaultRunner(transport);
  }

  start(source: RefinableSource): RefinementDocument {
    this.requestVersion += 1;
    this.source = normalizeRefinementDocument(source);
    this.proposal = null;
    this.error = null;
    this.iteration = 0;
    this.lastAcceptedIteration = 0;
    return this.source;
  }

  async refine(instructions: string): Promise<RefinementDocument | null> {
    const trimmed = instructions.trim();
    if (!this.source)
      throw new Error("Start a refinement before requesting one.");
    if (!trimmed) {
      this.error = "Tell the editor what you want to change.";
      return null;
    }
    if (this.isRefining) return null;

    const base = this.proposal ?? this.source;
    const requestVersion = this.requestVersion;
    this.isRefining = true;
    this.error = null;
    try {
      const next = applyRefinementProposal(
        base,
        await this.runner(base, trimmed),
      );
      if (requestVersion !== this.requestVersion) {
        return null;
      }
      this.proposal = next;
      this.iteration += 1;
      return next;
    } catch (error) {
      if (requestVersion !== this.requestVersion) return null;
      this.error =
        error instanceof Error ? error.message : "Refinement failed.";
      return null;
    } finally {
      if (requestVersion === this.requestVersion) this.isRefining = false;
    }
  }

  async refineAgain(instructions: string): Promise<RefinementDocument | null> {
    if (!this.proposal) {
      throw new Error("Create a refinement before requesting another pass.");
    }
    return this.refine(instructions);
  }

  accept(): RefinementDocument | null {
    const accepted = this.proposal;
    this.lastAcceptedIteration = this.iteration;
    this.reset();
    return accepted;
  }

  cancel(): void {
    this.reset();
  }

  private reset(): void {
    this.requestVersion += 1;
    this.source = null;
    this.proposal = null;
    this.error = null;
    this.iteration = 0;
    this.isRefining = false;
  }
}

export const generatorRefinementService = new GeneratorRefinementService();
