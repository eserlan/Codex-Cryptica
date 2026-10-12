import { goto } from "$app/navigation";
import { resolve } from "$app/paths";
import { dev } from "$app/environment";
import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import { trackPublicGeneratorAction } from "$lib/services/analytics/zaraz-analytics";
import { createMonsterLabsHandoffFlow } from "$lib/services/seo/monsterlabs-handoff-flow.svelte";
import { unregisterDevelopmentServiceWorkers } from "$lib/utils/dev-service-worker";
import {
  buildAdventureCanvasTransfer,
  buildDelveCanvasTransfer,
} from "$lib/components/seo/generator-canvas-transfer";
import { handoffGeneratorToCanvas } from "$lib/components/seo/generator-canvas-handoff";
import type { getGeneratorDocumentLayout } from "$lib/components/seo/generator-document-layout";

type DocumentLayout = ReturnType<typeof getGeneratorDocumentLayout>;

/** Sends a generated result on to MonsterLabs or to a new canvas. */
export function useGeneratorHandoffs(deps: {
  getGeneratorType: () => string;
  getDocumentLayout: () => DocumentLayout;
  setError: (message: string) => void;
}) {
  // The user confirms in a modal first; only after that confirm does the
  // Oracle compression call run (shown as its own "loading" state), and
  // MonsterLabs opens once the URL is ready.
  const monsterLabsFlow = createMonsterLabsHandoffFlow();

  function handleSendToMonsterLabs(data: GeneratorOutput) {
    trackPublicGeneratorAction("copy", {
      generator_type: deps.getGeneratorType(),
      copy_target: "monsterlabs",
    });
    const documentLayout = deps.getDocumentLayout();
    monsterLabsFlow.start({
      name: data.title,
      type: data.type,
      description: [documentLayout.content, documentLayout.lore]
        .filter((part): part is string => Boolean(part?.trim()))
        .join("\n\n"),
    });
  }

  function openOnCanvas(
    data: GeneratorOutput,
    buildTransfer: Parameters<typeof handoffGeneratorToCanvas>[1],
  ) {
    return handoffGeneratorToCanvas(data, buildTransfer, {
      storeTransfer: (key, transfer) =>
        localStorage.setItem(key, JSON.stringify(transfer)),
      unregisterDevelopmentServiceWorkers,
      isDevelopment: dev,
      navigate: () => goto(resolve("/canvas")),
      navigateInDevelopment: () => window.location.assign(resolve("/canvas")),
    });
  }

  async function handleBuildDelveCanvas(data: GeneratorOutput) {
    try {
      await openOnCanvas(data, buildDelveCanvasTransfer);
    } catch (err) {
      console.error("[DelveCanvas] Failed to build delve canvas:", err);
      deps.setError(
        "The generated delve could not be opened. Your pending canvas has been preserved so you can retry.",
      );
    }
  }

  async function handleBuildAdventureCanvas(data: GeneratorOutput) {
    try {
      await openOnCanvas(data, buildAdventureCanvasTransfer);
    } catch (err) {
      console.error("[AdventureCanvas] Failed to build adventure canvas:", err);
      deps.setError("Failed to open Adventure Canvas for this scenario.");
    }
  }

  return {
    monsterLabsFlow,
    handleSendToMonsterLabs,
    handleBuildDelveCanvas,
    handleBuildAdventureCanvas,
  };
}
