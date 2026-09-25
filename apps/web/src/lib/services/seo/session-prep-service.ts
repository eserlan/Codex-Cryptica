import {
  addRoutesToClue,
  buildClueRoutesPrompt,
  buildSessionPrepDraftPrompt,
  buildSessionPrepSuggestionPrompt,
  clearSessionPrepStep,
  defaultIdFactory,
  emptySessionPrepSteps,
  hasSessionPrepContent,
  isSessionPrepStepEmpty,
  mergeDraftIntoPrep,
  parseClueRoutes,
  parseSessionPrepDraft,
  parseSessionPrepSuggestion,
  SESSION_PREP_SYSTEM_INSTRUCTION,
  type IdFactory,
  type SessionPrep,
  type SessionPrepRequest,
  type SessionPrepStep,
  type SessionPrepSuggestion,
} from "generator-engine";
import {
  GeneratorAITransport,
  LANGUAGE_GENERATION_CONFIG,
} from "./generator-ai-transport";

export const SESSION_PREP_SEED_MAX_LENGTH = 2_000;

export interface SessionPrepTransport {
  runModel(
    systemInstruction: string,
    userMessage: string,
    generationConfig?: typeof LANGUAGE_GENERATION_CONFIG,
  ): Promise<string>;
}

export class SessionPrepService {
  constructor(
    private readonly transport: SessionPrepTransport,
    private readonly ids: IdFactory = defaultIdFactory,
  ) {}

  /*
   * Every AI call takes an optional `request`: the GM's note for this step and
   * their wider guidance (notes on other steps, ideas turned down). It is sent
   * with the prep instead of a chat history and never stored in it.
   */

  /** Drafts every empty step; returns the prep unchanged when none are empty. */
  draft(prep: SessionPrep, request?: SessionPrepRequest): Promise<SessionPrep> {
    return this.draftSteps(prep, emptySessionPrepSteps(prep), request);
  }

  /** Answers one question; leaves the step alone if it is filled. */
  draftStep(
    prep: SessionPrep,
    step: SessionPrepStep,
    request?: SessionPrepRequest,
  ): Promise<SessionPrep> {
    return this.draftSteps(
      prep,
      isSessionPrepStepEmpty(prep, step) ? [step] : [],
      request,
    );
  }

  /** Replaces one step with a fresh AI draft that fits the rest of the prep. */
  redraftStep(
    prep: SessionPrep,
    step: SessionPrepStep,
    request?: SessionPrepRequest,
  ): Promise<SessionPrep> {
    return this.draftSteps(clearSessionPrepStep(prep, step), [step], request);
  }

  private async draftSteps(
    prep: SessionPrep,
    steps: SessionPrepStep[],
    request?: SessionPrepRequest,
  ): Promise<SessionPrep> {
    validate(prep);
    if (steps.length === 0) return prep;
    const raw = await this.run(
      buildSessionPrepDraftPrompt(prep, steps, request),
    );
    return mergeDraftIntoPrep(
      prep,
      parseSessionPrepDraft(raw, steps),
      this.ids,
    );
  }

  async suggest(
    prep: SessionPrep,
    step: SessionPrepStep,
    request?: SessionPrepRequest,
  ): Promise<SessionPrepSuggestion> {
    validate(prep);
    const raw = await this.run(
      buildSessionPrepSuggestionPrompt(prep, step, request),
    );
    return parseSessionPrepSuggestion(raw, step);
  }

  async suggestRoutes(
    prep: SessionPrep,
    clueId: string,
    request?: SessionPrepRequest,
  ): Promise<SessionPrep> {
    const clue = prep.information.find((item) => item.id === clueId);
    if (!clue)
      throw new Error("We could not find that fact. Please try again.");
    validate(prep);
    const raw = await this.run(buildClueRoutesPrompt(prep, clue, request));
    return addRoutesToClue(prep, clueId, parseClueRoutes(raw));
  }

  private run(prompt: string): Promise<string> {
    return this.transport.runModel(
      SESSION_PREP_SYSTEM_INSTRUCTION,
      prompt,
      LANGUAGE_GENERATION_CONFIG,
    );
  }
}

function validate(prep: SessionPrep): void {
  if (!hasSessionPrepContent(prep)) {
    throw new Error("Add a hook or fill in a step to get started.");
  }
  if (prep.seed.length > SESSION_PREP_SEED_MAX_LENGTH) {
    throw new Error(
      `Keep your hook under ${SESSION_PREP_SEED_MAX_LENGTH} characters.`,
    );
  }
}

export function createSessionPrepService(
  transport: SessionPrepTransport = new GeneratorAITransport(),
): SessionPrepService {
  return new SessionPrepService(transport);
}
