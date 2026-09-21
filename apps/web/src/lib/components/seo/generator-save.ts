import type { GeneratorOutput } from "$lib/services/seo/generator-engine";
import type { ProvenanceRecord, SessionEntity } from "generator-engine";

export interface GeneratorSaveLayout {
  content: string;
  lore: string;
}

export interface GeneratorSavePayload {
  type: GeneratorOutput["type"];
  kind?: string;
  title: string;
  content: string;
  lore: string;
  labels: string[];
  status: GeneratorOutput["status"];
  mapImageDataUrl?: string;
}

export interface HubSaveDraft {
  type: SessionEntity["type"];
  kind?: SessionEntity["kind"];
  title: string;
  content: string;
  lore?: string;
  labels: string[];
  status: SessionEntity["status"];
  references?: string[];
}

/** Build the vault payload while keeping adventure-specific layout rules out of the page. */
export function buildGeneratorSavePayload(
  data: GeneratorOutput,
  layout: GeneratorSaveLayout,
  mapImageDataUrl?: string,
): GeneratorSavePayload {
  const isAdventure =
    data.kind === "adventure" || data.labels.includes("adventure");
  const content = isAdventure
    ? data.summary
      ? `*${data.summary}*`
      : ""
    : data.summary
      ? `*${data.summary}*\n\n${layout.content}`
      : layout.content;
  const lore = isAdventure
    ? [data.content, data.lore].filter(Boolean).join("\n\n")
    : layout.lore;

  return {
    type: isAdventure ? "note" : data.type,
    kind: data.kind,
    title: data.title,
    content,
    lore,
    labels: data.labels,
    status: data.status,
    ...(mapImageDataUrl ? { mapImageDataUrl } : {}),
  };
}

/** Resolve session-hub provenance into the references accepted by vault import. */
export function buildHubSaveDrafts(
  entities: SessionEntity[],
  provenance: Record<string, ProvenanceRecord>,
  allEntities: SessionEntity[] = entities,
): HubSaveDraft[] {
  return entities.map((entity) => {
    const record = provenance[entity.id];
    const references = record?.usedEntityIds
      .map((id) => allEntities.find((candidate) => candidate.id === id)?.title)
      .filter((title): title is string => Boolean(title));

    return {
      type: entity.type,
      kind: entity.kind,
      title: entity.title,
      content: entity.content,
      lore: entity.lore,
      labels: entity.labels,
      status: entity.status,
      ...(record && record.usedEntityIds.length > 0 ? { references } : {}),
    };
  });
}
