import { resolveEntitySilhouette } from "schema";
import type { SessionEntity } from "generator-engine";
import type {
  CreatedGeneratorShare,
  GeneratorShareCreateInput,
} from "$lib/services/sharing/GeneratorShareService";
import {
  buildGeneratorMarkdown,
  type GeneratorCopyDocument,
} from "./generator-copy";
import type { GeneratorShareSource } from "$lib/services/sharing/generator-share-tracking";

export type GeneratorShareDocument = GeneratorCopyDocument & {
  /** Entity type used to select the share preview silhouette. */
  type?: string;
};

export interface GeneratorPageSharingDeps {
  getGeneratorType: () => string;
  getTheme: () => string;
  getWorldTheme: () => string;
  getCanonicalPath: () => string | undefined;
  getOgImage: () => string;
  createShare: (
    input: GeneratorShareCreateInput,
  ) => Promise<CreatedGeneratorShare>;
  revokeShare: (shareId: string) => Promise<void>;
  onShareCreated: (input: {
    generatorType: string;
    source: GeneratorShareSource;
  }) => void;
}

export function createGeneratorPageSharing(deps: GeneratorPageSharingDeps) {
  async function prepareShare(
    source: GeneratorShareSource,
    document: GeneratorShareDocument,
  ) {
    const generatorType = deps.getGeneratorType();
    const worldTheme = deps.getTheme() || deps.getWorldTheme();
    const silhouette = resolveEntitySilhouette(
      {
        type: document.type || generatorType,
        title: document.title,
        labels: document.labels,
        content: document.content,
        lore: document.lore,
      },
      { worldTheme },
    ).id;
    const share = await deps.createShare({
      generatorId: generatorType,
      title: document.title,
      content: buildGeneratorMarkdown(document),
      metadata: {
        description:
          document.summary ||
          document.content
            .replace(/[#*_\n]/g, " ")
            .trim()
            .slice(0, 280),
        theme: worldTheme,
        labels: document.labels?.slice(0, 8),
        generatorPath: deps.getCanonicalPath() || "/generators",
        imageUrl: deps.getOgImage().startsWith("https://")
          ? deps.getOgImage()
          : undefined,
        silhouette,
      },
    });
    deps.onShareCreated({ generatorType, source });
    return {
      url: share.url,
      title: document.title,
      text: share.share.metadata.description || "Created with Codex Cryptica",
      cleanup: () => deps.revokeShare(share.share.shareId),
    };
  }

  return {
    prepareCurrentOutputShare: (document: GeneratorShareDocument) =>
      prepareShare("current_output", document),
    prepareSessionEntityShare: (entity: SessionEntity) =>
      prepareShare("session_hub_detail", {
        title: entity.title,
        summary: entity.summary,
        labels: entity.labels,
        content: entity.content,
        lore: entity.lore,
        type: entity.type,
        summaryIncludedInContent: Boolean(
          entity.summary &&
          entity.content.trim().startsWith(`*${entity.summary.trim()}*`),
        ),
      }),
  };
}
