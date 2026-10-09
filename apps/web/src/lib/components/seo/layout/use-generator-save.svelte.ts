import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { SessionEntity } from "generator-engine";
import { sessionHubStore } from "$lib/stores/session-hub.svelte";
import { trackPublicGeneratorAction } from "$lib/services/analytics/zaraz-analytics";
import {
  trackSaveToCodex,
  countRelatedEntities,
} from "$lib/services/analytics/generator-save-tracking";
import {
  saveGeneratorOutput,
  saveSessionHubEntities,
} from "$lib/components/seo/generator-save-flow";
import type { getGeneratorDocumentLayout } from "$lib/components/seo/generator-document-layout";

type DocumentLayout = ReturnType<typeof getGeneratorDocumentLayout>;

/** Hands generated drafts to the Codex app through localStorage. */
export function useGeneratorSave(deps: {
  getGeneratorType: () => string;
  getGeneratedData: () => GeneratorOutput | null;
  getDocumentLayout: () => DocumentLayout;
  exportDiagramImage: () => Promise<string | undefined>;
  setError: (message: string) => void;
}) {
  let showSaveModal = $state(false);
  let redirectQuery = $state("");

  const storage = {
    store: (key: string, value: string) => localStorage.setItem(key, value),
    track: trackSaveToCodex,
    countRelatedEntities,
  };

  function confirmSaveRedirect() {
    trackPublicGeneratorAction("open_codex", {
      generator_type: deps.getGeneratorType(),
      source: "save_confirmation",
    });
    showSaveModal = false;
  }

  function trackHeaderOpenCodex() {
    trackPublicGeneratorAction("open_codex", {
      generator_type: deps.getGeneratorType(),
      source: "header",
    });
  }

  function handleSaveHubToCodex(entitiesToSave: SessionEntity[]) {
    if (entitiesToSave.length === 0) return;
    const generatorType = deps.getGeneratorType();
    trackPublicGeneratorAction("save_to_codex", {
      generator_type: generatorType,
      is_hub_batch: true,
      item_count: entitiesToSave.length,
    });
    try {
      redirectQuery = saveSessionHubEntities(
        entitiesToSave,
        sessionHubStore.provenance,
        sessionHubStore.entities,
        generatorType,
        storage,
      );
      showSaveModal = true;
    } catch {
      deps.setError("Storage access is blocked. Please copy drafts manually.");
    }
  }

  async function handleSaveToCodex() {
    const generatedData = deps.getGeneratedData();
    if (!generatedData) return;
    const generatorType = deps.getGeneratorType();
    trackPublicGeneratorAction("save_to_codex", {
      generator_type: generatorType,
      is_hub_batch: false,
      item_count: 1,
    });

    try {
      redirectQuery = await saveGeneratorOutput(
        generatedData,
        deps.getDocumentLayout(),
        generatorType,
        storage,
        deps.exportDiagramImage,
      );
      showSaveModal = true;
    } catch {
      deps.setError(
        "Storage access is blocked. Please copy the Markdown below instead.",
      );
    }
  }

  return {
    confirmSaveRedirect,
    trackHeaderOpenCodex,
    handleSaveHubToCodex,
    handleSaveToCodex,
    cancelSaveModal() {
      showSaveModal = false;
    },
    get showSaveModal() {
      return showSaveModal;
    },
    get redirectQuery() {
      return redirectQuery;
    },
  };
}
