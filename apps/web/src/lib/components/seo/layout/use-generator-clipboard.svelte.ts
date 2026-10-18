import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { SessionEntity } from "generator-engine";
import type { ClipboardService } from "$lib/services/ClipboardService";
import { trackPublicGeneratorAction } from "$lib/services/analytics/zaraz-analytics";
import {
  buildGeneratorMarkdown,
  buildSectionMarkdown,
  buildSessionEntityMarkdown,
} from "$lib/components/seo/generator-copy";
import { handleGeneratorInlineCopy } from "$lib/components/seo/generator-inline-copy";
import type { getGeneratorDocumentLayout } from "$lib/components/seo/generator-document-layout";

type DocumentLayout = ReturnType<typeof getGeneratorDocumentLayout>;

/** Copy-to-clipboard actions for the output card, its sections and the hub. */
export function useGeneratorClipboard(deps: {
  getClipboardService: () => ClipboardService;
  getGeneratorType: () => string;
  getGeneratedData: () => GeneratorOutput | null;
  getDocumentLayout: () => DocumentLayout;
}) {
  const { getGeneratorType, getGeneratedData } = deps;

  let copied = $state(false);
  let copiedSectionId = $state<string | null>(null);
  let copyError = $state(false);

  function trackCopy(extra: Record<string, unknown>) {
    trackPublicGeneratorAction("copy", {
      generator_type: getGeneratorType(),
      ...extra,
    });
  }

  async function handleCopyMarkdown() {
    const generatedData = getGeneratedData();
    if (!generatedData) return;
    trackCopy({ copy_target: "markdown" });

    const documentLayout = deps.getDocumentLayout();
    const markdownText = buildGeneratorMarkdown({
      title: generatedData.title,
      summary: generatedData.summary,
      labels: generatedData.labels,
      content: documentLayout.content,
      lore: documentLayout.lore,
    });

    try {
      const success = await deps.getClipboardService().copyContent({
        markdown: markdownText,
      });
      if (!success) throw new Error("Clipboard copy failed");
      copyError = false;
      copied = true;
      setTimeout(() => {
        copied = false;
      }, 2000);
    } catch (err) {
      console.error("Failed to copy markdown:", err);
      copyError = true;
    }
  }

  async function handleCopySection(sectionId: string, markdown: string) {
    trackCopy({ copy_target: "section", section_id: sectionId });
    try {
      const success = await deps.getClipboardService().copyContent({
        markdown: buildSectionMarkdown(markdown),
      });
      if (!success) throw new Error("Clipboard copy failed");
      copyError = false;
      copiedSectionId = sectionId;
      setTimeout(() => {
        if (copiedSectionId === sectionId) copiedSectionId = null;
      }, 1600);
    } catch (err) {
      console.error("Failed to copy section markdown:", err);
      copyError = true;
    }
  }

  async function handleCopySessionEntity(
    entity: SessionEntity,
  ): Promise<boolean> {
    trackCopy({ copy_target: "session_hub_detail" });
    return deps.getClipboardService().copyContent({
      markdown: buildSessionEntityMarkdown(entity),
    });
  }

  function handleContainerClick(event: MouseEvent) {
    handleGeneratorInlineCopy(event, {
      clipboard: { writeText: (text) => navigator.clipboard.writeText(text) },
      trackCopy: () => trackCopy({ copy_target: "inline" }),
    });
  }

  function handleContainerKeydown(event: KeyboardEvent) {
    if (event.key === "Enter" || event.key === " ") {
      handleContainerClick(event as unknown as MouseEvent);
    }
  }

  return {
    handleCopyMarkdown,
    handleCopySection,
    handleCopySessionEntity,
    handleContainerClick,
    handleContainerKeydown,
    trackDiagramCopy: () => trackCopy({ copy_target: "diagram_image" }),
    get copied() {
      return copied;
    },
    get copiedSectionId() {
      return copiedSectionId;
    },
    get copyError() {
      return copyError;
    },
  };
}
