import {
  campaignGeneratorService,
  extractPartialJsonStringFields,
  type CampaignGeneratorService,
  type GeneratedDraft,
  type GenerationEvent,
  type GeneratorRunRequest,
} from "generator-engine";
import { publishGeneratedCapture } from "#lib/services/generator-journal-capture.js";
import { systemClock } from "#lib/utils/runtime-deps.js";
import {
  campaignGeneratorRequestBuilder,
  type CampaignGenerateInput,
} from "./campaign-generator-request.js";

type Stage = "configure" | "generating" | "review" | "saving" | "error";
const defaultDeps = {
  service: campaignGeneratorService as Pick<
    CampaignGeneratorService,
    "generateDraftStream"
  >,
  requestBuilder: campaignGeneratorRequestBuilder,
  publishGeneratedCapture,
  clock: systemClock,
};

/** Per-modal generation lifecycle, including cancellation and progressive preview. */
export class CampaignGeneration {
  stage = $state<Stage>("configure");
  draft = $state<GeneratedDraft | null>(null);
  streamedFields = $state<Record<string, string>>({});
  streamedJson = $state("");
  currentPhase = $state<string | null>(null);
  errorMsg = $state<string | null>(null);
  private abortController: AbortController | null = null;

  constructor(private readonly deps = defaultDeps) {}

  private clearPreview() {
    this.streamedFields = {};
    this.streamedJson = "";
    this.currentPhase = null;
  }

  configure() {
    this.stage = "configure";
    this.errorMsg = null;
  }

  cancel() {
    this.abortController?.abort();
    this.abortController = null;
    this.clearPreview();
    this.configure();
  }

  reset() {
    this.cancel();
    this.draft = null;
  }

  private receiveDraft(draft: GeneratedDraft) {
    // A final draft supersedes non-terminal errors (the engine falls back locally).
    this.draft = draft;
    this.errorMsg = null;
    this.stage = "review";
    try {
      this.deps.publishGeneratedCapture(
        {
          generatorId: draft.sourceGeneratorId,
          title: draft.title,
          summary: draft.summary,
        },
        { clock: this.deps.clock },
      );
    } catch (err) {
      console.error("Could not record the generated result:", err);
    }
    if (import.meta.env.DEV)
      console.debug("[Generator stream] modal received final draft");
  }

  private receiveDelta(text: string) {
    this.streamedJson += text;
    this.streamedFields = extractPartialJsonStringFields(this.streamedJson);
    if (import.meta.env.DEV)
      console.debug("[Generator stream] modal preview updated", {
        deltaLength: text.length,
        totalLength: this.streamedJson.length,
        fields: Object.keys(this.streamedFields),
      });
  }

  private receiveField(key: string, value: unknown) {
    if (typeof value !== "string") return;
    this.streamedFields = { ...this.streamedFields, [key]: value };
    if (import.meta.env.DEV)
      console.debug("[Generator stream] modal field completed", {
        key,
        valueLength: value.length,
      });
  }

  private receive(
    event: GenerationEvent | { type: "draft"; draft: GeneratedDraft },
  ) {
    switch (event.type) {
      case "phase":
        this.clearPreview();
        this.currentPhase = event.label;
        break;
      case "delta":
        this.receiveDelta(event.text);
        break;
      case "field":
        this.receiveField(event.key, event.value);
        break;
      case "draft":
        this.receiveDraft(event.draft);
        break;
      default:
        // Error events are non-terminal; fatal failures are thrown by the stream.
        if (import.meta.env.DEV)
          console.debug("[Generator stream] modal event", { type: event.type });
    }
  }

  private async consumeStream(
    runRequest: GeneratorRunRequest,
    signal: AbortSignal,
  ) {
    for await (const event of this.deps.service.generateDraftStream(
      runRequest,
      signal,
    )) {
      if (signal.aborted) break;
      this.receive(event);
    }
  }

  async generate(
    req: CampaignGenerateInput,
    sourceEntityId: string | null,
    getAIPolicy: () => { isEnabled: boolean; isAvailable: boolean },
  ) {
    if (this.stage === "generating" || this.stage === "saving") return;
    this.stage = "generating";
    this.errorMsg = null;
    this.clearPreview();
    const controller = new AbortController();
    this.abortController = controller;
    try {
      const runRequest = await this.deps.requestBuilder.build(
        req,
        sourceEntityId,
        getAIPolicy,
      );
      if (import.meta.env.DEV)
        console.debug("[Generator stream] modal generation started", {
          generatorId: req.generatorId,
          useAI: runRequest.useAI,
          usesInteraction: !!runRequest.interaction,
        });
      await this.consumeStream(runRequest, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      this.errorMsg = err instanceof Error ? err.message : String(err);
      this.stage = "error";
    } finally {
      if (this.abortController === controller) this.abortController = null;
    }
  }
}
