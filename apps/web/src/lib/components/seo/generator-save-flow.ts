import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { ProvenanceRecord, SessionEntity } from "generator-engine";
import {
  buildGeneratorSavePayload,
  buildHubSaveDrafts,
  type GeneratorSaveLayout,
} from "./generator-save";

export interface GeneratorSaveFlowDependencies {
  store: (key: string, value: string) => void;
  track: (details: {
    generatorType: string;
    isHubBatch: boolean;
    itemCount: number;
    relatedEntityCount: number;
  }) => void;
  countRelatedEntities: (content: string, references?: string[]) => number;
}

const PENDING_IMPORT_KEY = "__codex_pending_import";

/** Prepare and persist one generated result, returning its outbound URL query. */
export async function saveGeneratorOutput(
  data: GeneratorOutput,
  layout: GeneratorSaveLayout,
  generatorType: string,
  dependencies: GeneratorSaveFlowDependencies,
  exportMapImage?: () => Promise<string | undefined>,
): Promise<string> {
  let mapImageDataUrl: string | undefined;
  if (exportMapImage) {
    try {
      mapImageDataUrl = await exportMapImage();
    } catch (error) {
      // Map export is best effort; saving the generated draft remains available.
      console.error("Failed to rasterize generator diagram:", error);
    }
  }

  const payload = buildGeneratorSavePayload(data, layout, mapImageDataUrl);
  dependencies.store(PENDING_IMPORT_KEY, JSON.stringify(payload));
  dependencies.track({
    generatorType,
    isHubBatch: false,
    itemCount: 1,
    relatedEntityCount: dependencies.countRelatedEntities(
      payload.content,
      undefined,
    ),
  });
  return `?utm_source=generator-${data.type}&utm_medium=save-to-vault&utm_campaign=seo-funnel`;
}

/** Prepare and persist selected session-hub entities with provenance references. */
export function saveSessionHubEntities(
  entities: SessionEntity[],
  provenance: Record<string, ProvenanceRecord>,
  allEntities: SessionEntity[],
  generatorType: string,
  dependencies: GeneratorSaveFlowDependencies,
): string {
  const drafts = buildHubSaveDrafts(entities, provenance, allEntities);
  dependencies.store(PENDING_IMPORT_KEY, JSON.stringify(drafts));
  dependencies.track({
    generatorType,
    isHubBatch: true,
    itemCount: drafts.length,
    relatedEntityCount: drafts.reduce(
      (sum, draft) =>
        sum +
        dependencies.countRelatedEntities(draft.content, draft.references),
      0,
    ),
  });
  return "?utm_source=generator-session-hub&utm_medium=save-all&utm_campaign=seo-funnel";
}
