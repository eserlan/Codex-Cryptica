import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { SessionEntity } from "generator-engine";
import { generatorShareService } from "$lib/services/sharing/GeneratorShareService";
import {
  trackGeneratorShareCreated,
  trackGeneratorShareLinkCopied,
  trackGeneratorShareCompleted,
  trackGeneratorShareClicked,
  type GeneratorShareSource,
} from "$lib/services/sharing/generator-share-tracking";
import { createGeneratorPageSharing } from "$lib/components/seo/generator-page-sharing";
import type { getGeneratorDocumentLayout } from "$lib/components/seo/generator-document-layout";

type DocumentLayout = ReturnType<typeof getGeneratorDocumentLayout>;

/** Share-link preparation and analytics for the output card and hub details. */
export function useGeneratorSharing(deps: {
  getGeneratorType: () => string;
  getTheme: () => string;
  getWorldTheme: () => string;
  getCanonicalPath: () => string | undefined;
  getOgImage: () => string;
  getGeneratedData: () => GeneratorOutput | null;
  getDocumentLayout: () => DocumentLayout;
}) {
  const pageSharing = createGeneratorPageSharing({
    getGeneratorType: deps.getGeneratorType,
    getTheme: deps.getTheme,
    getWorldTheme: deps.getWorldTheme,
    getCanonicalPath: deps.getCanonicalPath,
    getOgImage: deps.getOgImage,
    createShare: (input) => generatorShareService.create(input),
    revokeShare: (shareId) => generatorShareService.revoke(shareId),
    onShareCreated: trackGeneratorShareCreated,
  });

  function tracking(source: GeneratorShareSource) {
    const event = () => ({ generatorType: deps.getGeneratorType(), source });
    return {
      onShareClicked: () => trackGeneratorShareClicked(event()),
      onShareCompleted: () => trackGeneratorShareCompleted(event()),
      onShareLinkCopied: () => trackGeneratorShareLinkCopied(event()),
    };
  }

  function prepareCurrentOutputShare() {
    const generatedData = deps.getGeneratedData();
    if (!generatedData)
      throw new Error("There is no generated result to share.");
    const documentLayout = deps.getDocumentLayout();
    return pageSharing.prepareCurrentOutputShare({
      title: generatedData.title,
      summary: generatedData.summary,
      labels: generatedData.labels,
      content: documentLayout.content,
      lore: documentLayout.lore,
    });
  }

  function prepareSessionEntityShare(entity: SessionEntity) {
    return pageSharing.prepareSessionEntityShare(entity);
  }

  return {
    prepareCurrentOutputShare,
    prepareSessionEntityShare,
    currentOutputTracking: tracking("current_output"),
    sessionDetailTracking: tracking("session_hub_detail"),
  };
}
