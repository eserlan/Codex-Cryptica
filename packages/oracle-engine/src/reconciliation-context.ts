export interface RelatedEntityContext {
  title: string;
  type: string;
  relation?: string;
  summary: string;
}

interface BuildReconciliationContextOptions {
  entity: {
    id: string;
    title: string;
    content?: string;
    lore?: string;
    connections?: Array<{
      target: string;
      type?: string;
      label?: string;
    }>;
  };
  incoming: {
    chronicle: string;
    lore: string;
  };
  vault: {
    entities: Record<string, any>;
    inboundConnections?: Record<
      string,
      Array<{
        sourceId: string;
        connection: {
          type?: string;
          label?: string;
        };
      }>
    >;
  };
  getConsolidatedContext: (entity: any) => string;
  limit?: number;
}

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function scoreTitleMentions(title: string, text: string): number {
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle) return 0;
  return text.includes(normalizedTitle) ? 1 : 0;
}

function summarizeContext(value: string, maxChars: number): string {
  const trimmed = value.replace(/[ \t]+/g, " ").trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars).trimEnd() + "...";
}

export function buildRelatedEntityContext(
  options: BuildReconciliationContextOptions,
): RelatedEntityContext[] {
  const {
    entity,
    incoming,
    vault,
    getConsolidatedContext,
    limit = 6,
  } = options;
  const currentText = normalizeText(
    [entity.title, entity.content || "", entity.lore || ""].join("\n"),
  );
  const incomingText = normalizeText(
    [incoming.chronicle || "", incoming.lore || ""].join("\n"),
  );
  const candidates = new Map<
    string,
    {
      title: string;
      type: string;
      relation?: string;
      summary: string;
      score: number;
    }
  >();

  const addCandidate = (
    relatedId: string,
    relation?: string,
    baseScore = 0,
  ) => {
    if (!relatedId || relatedId === entity.id) return;
    const related = vault.entities[relatedId];
    if (!related?.title) return;

    const summary = summarizeContext(getConsolidatedContext(related), 420);
    if (!summary) return;

    const titleScore =
      scoreTitleMentions(related.title, incomingText) * 6 +
      scoreTitleMentions(related.title, currentText) * 2;
    const existing = candidates.get(relatedId);
    const nextScore = baseScore + titleScore + (existing?.score || 0);

    candidates.set(relatedId, {
      title: related.title,
      type: related.type || "concept",
      relation: existing?.relation || relation,
      summary,
      score: nextScore,
    });
  };

  for (const connection of entity.connections || []) {
    addCandidate(connection.target, connection.label || connection.type, 2);
  }

  for (const inbound of vault.inboundConnections?.[entity.id] || []) {
    addCandidate(
      inbound.sourceId,
      inbound.connection.label || inbound.connection.type,
      2,
    );
  }

  return Array.from(candidates.values())
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
    .map(({ title, type, relation, summary }) => ({
      title,
      type,
      relation,
      summary,
    }));
}
