import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { RefinementDocument, SessionEntity } from "generator-engine";
import { GeneratorRefinementService } from "$lib/services/GeneratorRefinementService.svelte";
import { sessionHubStore } from "$lib/stores/session-hub.svelte";
import { loreMergeStore } from "$lib/stores/ui/lore-merge.svelte";
import { buildLoreMergePlan } from "$lib/utils/lore-sections";
import { trackEvent } from "$lib/services/analytics/zaraz-analytics";
import type { getGeneratorDocumentLayout } from "$lib/components/seo/generator-document-layout";
import type { getContextSelection } from "generator-engine";
import { recordGeneratedEntity } from "./record-generated-entity";

type DocumentLayout = ReturnType<typeof getGeneratorDocumentLayout>;
type ContextSelection = ReturnType<typeof getContextSelection>;
type RefinementOrigin = "current_output" | "session_hub";

function buildAcceptedOutput(
  document: RefinementDocument,
  base: GeneratorOutput | null,
): GeneratorOutput {
  return {
    ...(base ?? {}),
    type: document.type as GeneratorOutput["type"],
    ...(document.kind ? { kind: document.kind } : {}),
    title: document.title,
    summary: document.summary ?? "",
    content: document.content,
    lore: document.lore ?? "",
    labels: document.labels,
    status: document.status ?? "draft",
    aiFallback: undefined,
  };
}

/** The refine flow: open the modal for a result, merge lore, accept or cancel. */
export function useGeneratorRefinement(deps: {
  getGeneratorType: () => string;
  getGeneratedData: () => GeneratorOutput | null;
  getDocumentLayout: () => DocumentLayout;
  getCurrentEntityId: () => string | null;
  getContextSelection: () => ContextSelection;
  canRefineCurrentOutput: () => boolean;
  applyRefinedOutput: (output: GeneratorOutput, entityId: string) => void;
  onOpenFromHub: () => void;
}) {
  const service = new GeneratorRefinementService();
  let open = $state(false);
  let origin = $state<RefinementOrigin | null>(null);
  let sourceId = $state<string | undefined>(undefined);
  let sourceDocument = $state<RefinementDocument | null>(null);

  function reset() {
    open = false;
    origin = null;
    sourceId = undefined;
    sourceDocument = null;
  }

  function start(
    source: Parameters<typeof service.start>[0],
    from: RefinementOrigin,
    fromId?: string,
  ) {
    sourceDocument = service.start(source);
    origin = from;
    sourceId = fromId;
    open = true;
    trackEvent("generator_refinement_opened", {
      generator_type: deps.getGeneratorType(),
      source: from,
    });
  }

  function openForCurrentOutput() {
    const generatedData = deps.getGeneratedData();
    if (!generatedData || !deps.canRefineCurrentOutput()) return;
    const documentLayout = deps.getDocumentLayout();
    start(
      {
        ...generatedData,
        content: documentLayout.content || generatedData.content,
        lore: documentLayout.lore || generatedData.lore,
      },
      "current_output",
      deps.getCurrentEntityId() ?? undefined,
    );
  }

  function openForHubEntity(entity: SessionEntity) {
    deps.onOpenFromHub();
    start(entity, "session_hub", entity.id);
  }

  function cancel() {
    service.cancel();
    reset();
    trackEvent("generator_refinement_cancelled", {
      generator_type: deps.getGeneratorType(),
    });
  }

  function onRequested(repeated: boolean) {
    trackEvent("generator_refinement_requested", {
      generator_type: deps.getGeneratorType(),
      source: origin ?? "current_output",
      repeated,
    });
  }

  /** Lets the user resolve lore conflicts; null means they backed out. */
  async function resolveLore(document: RefinementDocument) {
    if (
      !sourceDocument?.lore ||
      !document.lore ||
      sourceDocument.lore === document.lore
    ) {
      return document;
    }
    const plan = buildLoreMergePlan(sourceDocument.lore, document.lore);
    if (!plan.hasChanges) return document;

    open = false;
    const resolvedLore = await loreMergeStore.request(
      plan,
      sourceDocument.title,
    );
    if (resolvedLore === null) {
      open = true;
      return null;
    }
    return { ...document, lore: resolvedLore };
  }

  async function accept(proposed: RefinementDocument) {
    const document = await resolveLore(proposed);
    if (!document) return;

    const acceptedOrigin = origin ?? "current_output";
    const fromId = sourceId;
    const generatedData = deps.getGeneratedData();
    const accepted = buildAcceptedOutput(
      document,
      acceptedOrigin === "current_output" ? generatedData : null,
    );

    const derivedId = recordGeneratedEntity(
      sessionHubStore,
      $state.snapshot(deps.getContextSelection()),
      accepted,
      {
        ...(fromId ? { derivedFromEntityId: fromId } : {}),
        derivation: "refine",
      },
    );
    deps.applyRefinedOutput(accepted, derivedId);
    if (fromId) sessionHubStore.removeEntity(fromId);

    const acceptedIteration = service.iteration;
    service.accept();
    reset();
    trackEvent("generator_refinement_accepted", {
      generator_type: deps.getGeneratorType(),
      source: acceptedOrigin,
      iteration: acceptedIteration,
    });
  }

  return {
    service,
    openForCurrentOutput,
    openForHubEntity,
    cancel,
    onRequested,
    accept,
    get open() {
      return open;
    },
  };
}
