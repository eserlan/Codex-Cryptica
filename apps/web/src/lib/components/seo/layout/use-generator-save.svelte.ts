import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import type { SessionEntity } from "generator-engine/session-hub-helpers";
import { sessionHubStore } from "#lib/stores/session-hub.svelte.js";
import { trackPublicGeneratorAction } from "#lib/services/analytics/zaraz-analytics.js";
import {
  trackSaveToCodex,
  countRelatedEntities,
} from "#lib/services/analytics/generator-save-tracking.js";
import {
  saveGeneratorOutput,
  saveSessionHubEntities,
} from "#lib/components/seo/generator-save-flow.js";
import { InvalidGeneratorOutputError } from "#lib/components/seo/generator-save.js";
import type { getGeneratorDocumentLayout } from "#lib/components/seo/generator-document-layout.js";

type DocumentLayout = ReturnType<typeof getGeneratorDocumentLayout>;

function countSavedItems(
  data: GeneratorOutput,
  selectedNodeIds: string[] | undefined,
): number {
  if (!data.pointCrawl) return 1;
  return (selectedNodeIds?.length ?? data.pointCrawl.nodes.length) + 1;
}

/** Hands generated drafts to the Codex app through localStorage. */
export function useGeneratorSave(deps: {
  getGeneratorType: () => string;
  getGeneratedData: () => GeneratorOutput | null;
  isGenerationInProgress?: () => boolean;
  getDocumentLayout: () => DocumentLayout;
  exportDiagramImage: () => Promise<string | undefined>;
  getSelectedNodeIds?: () => string[] | undefined;
  setError: (message: string) => void;
  navigate?: (href: string) => unknown;
}) {
  const navigate = deps.navigate ?? ((href: string) => goto(href));
  let isSaving = $state(false);
  let saveError = $state<string | null>(null);

  const storage = {
    store: (key: string, value: string) => localStorage.setItem(key, value),
    track: trackSaveToCodex,
    countRelatedEntities,
  };

  function continueToCodex(redirectQuery: string) {
    trackPublicGeneratorAction("open_codex", {
      generator_type: deps.getGeneratorType(),
      source: "save_confirmation",
    });
    // Stay "saving" while the page leaves; only a failed navigation resets it.
    void Promise.resolve()
      .then(() => navigate(resolve("") + redirectQuery))
      .catch(() => {
        isSaving = false;
      });
  }

  function trackHeaderOpenCodex() {
    trackPublicGeneratorAction("open_codex", {
      generator_type: deps.getGeneratorType(),
      source: "header",
    });
  }

  function handleSaveHubToCodex(entitiesToSave: SessionEntity[]) {
    if (isSaving || entitiesToSave.length === 0) return;
    isSaving = true;
    saveError = null;
    const generatorType = deps.getGeneratorType();
    trackPublicGeneratorAction("save_to_codex", {
      generator_type: generatorType,
      is_hub_batch: true,
      item_count: entitiesToSave.length,
    });
    try {
      const redirectQuery = saveSessionHubEntities(
        entitiesToSave,
        sessionHubStore.provenance,
        sessionHubStore.entities,
        generatorType,
        storage,
      );
      continueToCodex(redirectQuery);
    } catch {
      isSaving = false;
      const message = "Storage access is blocked. Please copy drafts manually.";
      saveError = message;
      deps.setError(message);
    }
  }

  async function handleSaveToCodex() {
    if (isSaving || deps.isGenerationInProgress?.()) return;
    const generatedData = deps.getGeneratedData();
    if (!generatedData) return;
    isSaving = true;
    saveError = null;
    const generatorType = deps.getGeneratorType();
    const selectedNodeIds = deps.getSelectedNodeIds?.();
    const itemCount = countSavedItems(generatedData, selectedNodeIds);
    trackPublicGeneratorAction("save_to_codex", {
      generator_type: generatorType,
      is_hub_batch: Boolean(generatedData.pointCrawl),
      item_count: itemCount,
    });

    try {
      const redirectQuery = await saveGeneratorOutput(
        generatedData,
        deps.getDocumentLayout(),
        generatorType,
        storage,
        deps.exportDiagramImage,
        selectedNodeIds,
      );
      continueToCodex(redirectQuery);
    } catch (error) {
      isSaving = false;
      const message =
        error instanceof InvalidGeneratorOutputError
          ? error.message
          : "Storage access is blocked. Please copy the Markdown below instead.";
      saveError = message;
      deps.setError(message);
    }
  }

  return {
    trackHeaderOpenCodex,
    handleSaveHubToCodex,
    handleSaveToCodex,
    clearSaveError() {
      saveError = null;
    },
    get saveError() {
      return saveError;
    },
    get isSaving() {
      return isSaving;
    },
  };
}
