import { computeProvenance, type SessionEntity } from "generator-engine";
import type { sessionHubStore } from "$lib/stores/session-hub.svelte";

type SessionHub = typeof sessionHubStore;

export interface GeneratedEntityFields {
  type: SessionEntity["type"];
  kind?: SessionEntity["kind"];
  title: string;
  summary?: string;
  content: string;
  lore?: string;
  labels: SessionEntity["labels"];
  status: SessionEntity["status"];
}

/**
 * Records a generated (or refined) draft in the session hub together with its
 * provenance, and returns the new entity id.
 */
export function recordGeneratedEntity(
  hub: SessionHub,
  context: Parameters<typeof computeProvenance>[2] extends infer E
    ? { entities: E; trimmed: Parameters<typeof computeProvenance>[3] }
    : never,
  fields: GeneratedEntityFields,
  extra: { derivedFromEntityId?: string; derivation?: "refine" } = {},
): string {
  const content = fields.summary
    ? `*${fields.summary}*\n\n${fields.content}`
    : fields.content;

  const id = hub.addEntity({
    type: fields.type,
    kind: fields.kind,
    title: fields.title,
    summary: fields.summary,
    content,
    lore: fields.lore,
    labels: fields.labels,
    status: fields.status,
    reuseEnabled: true,
    pinned: false,
    ...extra,
  } as Parameters<SessionHub["addEntity"]>[0]);

  hub.addProvenance(
    computeProvenance(
      id,
      content + "\n" + (fields.lore || ""),
      context.entities,
      context.trimmed,
    ),
  );
  return id;
}
