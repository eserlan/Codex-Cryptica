import {
  LoreDeltaTracker,
  buildInteractionInput,
  entityContentHash,
  type LoreEntry,
  type LorePartition,
} from "@codex/oracle-engine";
import type {
  GeneratedDraft,
  GeneratorVaultContext,
  VaultContextEntityExcerpt,
} from "./campaign-generator-types";

export interface GeneratorSessionTurn {
  input: string;
  previousInteractionId: string | null;
  sentLoreCount: number;
  retainedLoreCount: number;
}

export interface GeneratorAcceptedEntity {
  id: string;
  title: string;
  type: string;
  content?: string;
  lore?: string;
  labels?: string[];
}

function snippetEntry(id: string, title: string, body: string): LoreEntry {
  const snippet = `--- File: ${title} ---\n${body.trim()}`;
  return { id, snippet, hash: entityContentHash(snippet) };
}

function renderExcerpt(entity: VaultContextEntityExcerpt): string {
  const parts = [
    `Title: ${entity.title}`,
    `Type: ${entity.type}`,
    entity.relationship ? `Relationship: ${entity.relationship}` : "",
    entity.contentExcerpt ? `Content: ${entity.contentExcerpt}` : "",
    entity.loreExcerpt ? `Lore: ${entity.loreExcerpt}` : "",
    entity.labels?.length ? `Labels: ${entity.labels.join(", ")}` : "",
  ].filter(Boolean);
  return parts.join("\n");
}

function renderList(title: string, values: string[]): string {
  if (!values.length) return "";
  return `${title}:\n${values.map((value) => `- ${value}`).join("\n")}`;
}

export function buildGeneratorLoreEntries(
  context: GeneratorVaultContext | undefined,
): LoreEntry[] {
  if (!context) return [];

  const stable = [
    context.themeName || context.themeId
      ? `Theme: ${context.themeName || context.themeId}`
      : "",
    context.currentDate ? `Campaign date: ${context.currentDate}` : "",
    context.targetEntityType
      ? `Target entity type: ${context.targetEntityType}`
      : "",
    context.categoryLabels.length
      ? `Categories: ${context.categoryLabels.map((c) => `${c.label} (${c.id})`).join(", ")}`
      : "",
    context.applyTemplate && context.templateOutline
      ? `Template outline:\n${context.templateOutline}`
      : "",
    renderList("Existing titles to avoid", context.existingTitles),
    renderList("Banned names to avoid", context.bannedNames ?? []),
    renderList("Suggested labels", context.labelSuggestions),
  ].filter(Boolean);

  const entries: LoreEntry[] = [];
  if (stable.length) {
    entries.push(
      snippetEntry(
        "__generator_world__",
        "Generator world context",
        stable.join("\n\n"),
      ),
    );
  }
  if (context.sourceEntity) {
    entries.push(
      snippetEntry(
        `generator-source:${context.sourceEntity.id}`,
        context.sourceEntity.title,
        renderExcerpt(context.sourceEntity),
      ),
    );
  }
  for (const entity of context.neighbors) {
    entries.push(
      snippetEntry(
        `generator-neighbor:${entity.id}`,
        entity.title,
        renderExcerpt(entity),
      ),
    );
  }
  for (const entity of context.worldSample) {
    entries.push(
      snippetEntry(
        `generator-world:${entity.id}`,
        entity.title,
        renderExcerpt(entity),
      ),
    );
  }
  return entries;
}

export function draftToAcceptedEntity(
  entityId: string,
  draft: GeneratedDraft,
): GeneratorAcceptedEntity {
  return {
    id: entityId,
    title: draft.title,
    type: draft.entityType,
    content: draft.summary,
    lore: draft.lore,
    labels: draft.labels,
  };
}

export function acceptedEntityToLoreEntry(
  entity: GeneratorAcceptedEntity,
): LoreEntry {
  const body = [
    `Title: ${entity.title}`,
    `Type: ${entity.type}`,
    entity.content ? `Content: ${entity.content}` : "",
    entity.lore && entity.lore !== entity.content ? `Lore: ${entity.lore}` : "",
    entity.labels?.length ? `Labels: ${entity.labels.join(", ")}` : "",
  ].filter(Boolean);
  return snippetEntry(
    `generator-accepted:${entity.id}`,
    entity.title,
    body.join("\n"),
  );
}

export function buildGeneratorSessionInput(
  instruction: string,
  partition: LorePartition,
): string {
  return buildInteractionInput(instruction, partition)
    .replace("[VAULT LORE CONTEXT]", "[GENERATOR VAULT CONTEXT]")
    .replace("[USER QUERY]", "[GENERATOR REQUEST]");
}

export class GeneratorSession {
  previousInteractionId: string | null = null;

  private readonly tracker = new LoreDeltaTracker();
  private readonly acceptedEntries = new Map<string, LoreEntry>();

  prepareTurn(params: {
    instruction: string;
    loreEntries?: LoreEntry[];
  }): GeneratorSessionTurn {
    const entries = [
      ...(params.loreEntries ?? []),
      ...this.acceptedEntries.values(),
    ];
    const partition = this.tracker.partition(entries);
    return {
      input: buildGeneratorSessionInput(params.instruction, partition),
      previousInteractionId: this.previousInteractionId,
      sentLoreCount: partition.newOrChanged.length,
      retainedLoreCount: partition.unchanged.length,
    };
  }

  commitTurn(interactionId: string, loreEntries?: LoreEntry[]): void {
    const entries = [...(loreEntries ?? []), ...this.acceptedEntries.values()];
    this.previousInteractionId = interactionId;
    this.tracker.commit(entries);
  }

  commitAcceptedEntity(entity: GeneratorAcceptedEntity): void {
    const entry = acceptedEntityToLoreEntry(entity);
    this.acceptedEntries.set(entry.id, entry);
  }

  evictAcceptedEntity(entityId: string): void {
    const entryId = `generator-accepted:${entityId}`;
    this.acceptedEntries.delete(entryId);
    this.tracker.evict(entryId);
  }

  /**
   * Reset only the server-side interaction tracking (previous id + sent-lore
   * hashes) while keeping accepted entities, so an expired-id replay re-sends
   * all accumulated session lore instead of losing it. Used on retention replay.
   */
  resetInteractionState(): void {
    this.previousInteractionId = null;
    this.tracker.reset();
  }

  reset(): void {
    this.previousInteractionId = null;
    this.tracker.reset();
    this.acceptedEntries.clear();
  }
}
