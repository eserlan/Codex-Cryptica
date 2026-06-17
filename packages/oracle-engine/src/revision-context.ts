export interface RelatedEntityContext {
  title: string;
  type: string;
  relation?: string;
  summary: string;
}

interface BuildRevisionContextOptions {
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
  instructions?: string;
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

const MIN_TITLE_SCAN_LENGTH = 4;

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns 2 for a full-title match, 1 for a word-level match on any
 * significant word (≥ MIN_TITLE_SCAN_LENGTH chars) from the title, 0 otherwise.
 * Word-level matching catches partial references like "shas" hitting
 * "Republic of Shas".
 */
function scoreTitleMentions(title: string, text: string): number {
  const normalizedTitle = title.trim().toLowerCase();
  if (!normalizedTitle) return 0;
  if (text.includes(normalizedTitle)) return 2;
  const words = normalizedTitle
    .split(/\s+/)
    .filter((w) => w.length >= MIN_TITLE_SCAN_LENGTH);
  if (words.some((w) => new RegExp(`\\b${escapeRegex(w)}\\b`).test(text)))
    return 1;
  return 0;
}

function normalizeContext(value: string): string {
  return value.replace(/[ \t]+/g, " ").trim();
}

export function buildRelatedEntityContext(
  options: BuildRevisionContextOptions,
): RelatedEntityContext[] {
  const {
    entity,
    incoming,
    instructions,
    vault,
    getConsolidatedContext,
    limit = 6,
  } = options;
  const currentText = normalizeText(
    [entity.title, entity.content || "", entity.lore || ""].join("\n"),
  );
  const incomingText = normalizeText(
    [incoming.chronicle || "", incoming.lore || "", instructions || ""].join(
      "\n",
    ),
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

    const summary = normalizeContext(getConsolidatedContext(related));
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

  // Title-scan pass: pick up vault entities mentioned by name but lacking a graph edge
  for (const [id, related] of Object.entries(vault.entities)) {
    if (!id || id === entity.id || candidates.has(id)) continue;
    if (!related?.title || related.title.trim().length < MIN_TITLE_SCAN_LENGTH)
      continue;
    const mentionScore =
      scoreTitleMentions(related.title, incomingText) * 6 +
      scoreTitleMentions(related.title, currentText) * 2;
    if (mentionScore > 0) addCandidate(id, undefined, 0);
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
