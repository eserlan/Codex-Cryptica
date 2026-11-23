import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import type {
  ProvenanceRecord,
  SessionEntity,
} from "generator-engine/session-hub-helpers";
import {
  trackSaveHandoffFailed,
  type SaveHandoffFailedInput,
} from "#lib/services/analytics/generator-save-tracking.js";
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
  /** Defaults to `trackSaveHandoffFailed`. */
  trackFailure?: (details: SaveHandoffFailedInput) => void;
}

const PENDING_IMPORT_KEY = "__codex_pending_import";

// Store runs before track, so a throwing store yields the failure signal and
// never entity_saved; the original error is always the one rethrown.
function stagePendingImport(
  value: unknown,
  failure: SaveHandoffFailedInput,
  dependencies: GeneratorSaveFlowDependencies,
): void {
  try {
    dependencies.store(PENDING_IMPORT_KEY, JSON.stringify(value));
  } catch (error) {
    try {
      (dependencies.trackFailure ?? trackSaveHandoffFailed)(failure);
    } catch {
      // Analytics must never mask the storage error.
    }
    throw error;
  }
}

/** Prepare and persist one generated result, returning its outbound URL query. */
export async function saveGeneratorOutput(
  data: GeneratorOutput,
  layout: GeneratorSaveLayout,
  generatorType: string,
  dependencies: GeneratorSaveFlowDependencies,
  exportMapImage?: () => Promise<string | undefined>,
  selectedNodeIds?: string[],
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

  if (data.business) {
    const { buildBusinessImportDrafts } =
      await import("generator-engine/business-save");
    // The public page hands over the business and its people; outside parties
    // stay in the text (no vault here to match them against).
    const drafts = buildBusinessImportDrafts(data.business);
    stagePendingImport(
      drafts,
      { generatorType, isHubBatch: true, itemCount: drafts.length },
      dependencies,
    );
    dependencies.track({
      generatorType,
      isHubBatch: true,
      itemCount: drafts.length,
      relatedEntityCount: 0,
    });
    return `?utm_source=generator-business&utm_medium=save-to-vault&utm_campaign=seo-funnel`;
  }

  const pointCrawl = data.pointCrawl ?? (data.metadata?.pointCrawlState as any);
  if (pointCrawl) {
    const { buildPointCrawlSaveDrafts } =
      await import("generator-engine/point-crawl-save");
    const drafts = buildPointCrawlSaveDrafts(pointCrawl, {
      selectedNodeIds,
      mapImageDataUrl,
      status: data.status,
    });
    stagePendingImport(
      drafts,
      { generatorType, isHubBatch: true, itemCount: drafts.length },
      dependencies,
    );
    dependencies.track({
      generatorType,
      isHubBatch: true,
      itemCount: drafts.length,
      relatedEntityCount: drafts.reduce(
        (sum, d) =>
          sum +
          dependencies.countRelatedEntities(
            d.content,
            d.relationships?.map((r) => r.title),
          ),
        0,
      ),
    });
    return `?utm_source=generator-point-crawl&utm_medium=save-to-vault&utm_campaign=seo-funnel`;
  }

  const payload = buildGeneratorSavePayload(data, layout, mapImageDataUrl);
  stagePendingImport(
    payload,
    { generatorType, isHubBatch: false, itemCount: 1 },
    dependencies,
  );
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
  stagePendingImport(
    drafts,
    { generatorType, isHubBatch: true, itemCount: drafts.length },
    dependencies,
  );
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
