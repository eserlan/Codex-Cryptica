export interface RelatedEntityContext {
  id: string;
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
  debug?: (
    selected: Array<{ title: string; score: number; chars: number }>,
  ) => void;
}

const MIN_TITLE_SCAN_LENGTH = 4;

// Scoring weights — additive model: connected+named sums above either signal alone.
// e.g. connected(3) + named_incoming(6) = 9 > named_only(6) > connected_only(3)
const WEIGHT_CONNECTION = 3;
const WEIGHT_NAMED_INCOMING = 6;
const WEIGHT_NAMED_CURRENT = 2;

// Total context budget — prevents the combined related block from becoming too large.
const MAX_TOTAL_CHARS = 1600;

function normalizeText(value: string): string {
  return value.toLowerCase();
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Unicode-safe word boundary: asserts position is not surrounded by letter/digit/underscore.
function wordBoundaryRegex(word: string): RegExp {
  const escaped = escapeRegex(word);
  return new RegExp(
    `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`,
    "u",
  );
}

function scoreStringMentions(candidate: string, text: string): number {
  const normalized = candidate.trim().toLowerCase();
  if (!normalized) return 0;
  const isPhrase = /\s/.test(normalized);
  if (isPhrase) {
    // Multi-word phrase: substring match is specific enough.
    if (text.includes(normalized)) return 2;
  } else {
    // Single word: require boundary so "shas" doesn't match "shasoria".
    if (wordBoundaryRegex(normalized).test(text)) return 2;
  }
  const words = normalized
    .split(/\s+/)
    .filter((w) => w.length >= MIN_TITLE_SCAN_LENGTH);
  if (words.some((w) => wordBoundaryRegex(w).test(text))) return 1;
  return 0;
}

/**
 * Scores an entity against a text by checking its title and each alias,
 * returning the maximum score (2=full match, 1=word-level, 0=none).
 * Aliases shorter than MIN_TITLE_SCAN_LENGTH are skipped.
 */
function scoreEntityMentions(
  entity: { title: string; aliases?: string[] },
  text: string,
): number {
  let best = scoreStringMentions(entity.title, text);
  if (best === 2) return best;
  for (const alias of entity.aliases || []) {
    if (!alias || alias.trim().length < MIN_TITLE_SCAN_LENGTH) continue;
    const s = scoreStringMentions(alias, text);
    if (s > best) best = s;
    if (best === 2) return best;
  }
  return best;
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
    debug,
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
      id: string;
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
      scoreEntityMentions(related, incomingText) * WEIGHT_NAMED_INCOMING +
      scoreEntityMentions(related, currentText) * WEIGHT_NAMED_CURRENT;
    const existing = candidates.get(relatedId);
    const nextScore = baseScore + titleScore + (existing?.score || 0);

    candidates.set(relatedId, {
      id: relatedId,
      title: related.title,
      type: related.type || "concept",
      relation: existing?.relation || relation,
      summary,
      score: nextScore,
    });
  };

  for (const connection of entity.connections || []) {
    addCandidate(
      connection.target,
      connection.label || connection.type,
      WEIGHT_CONNECTION,
    );
  }

  for (const inbound of vault.inboundConnections?.[entity.id] || []) {
    addCandidate(
      inbound.sourceId,
      inbound.connection.label || inbound.connection.type,
      WEIGHT_CONNECTION,
    );
  }

  // Title-scan pass: pick up vault entities mentioned by name but lacking a graph edge
  for (const [id, related] of Object.entries(vault.entities)) {
    if (!id || id === entity.id || candidates.has(id)) continue;
    if (!related?.title || related.title.trim().length < MIN_TITLE_SCAN_LENGTH)
      continue;
    const mentionScore =
      scoreEntityMentions(related, incomingText) * WEIGHT_NAMED_INCOMING +
      scoreEntityMentions(related, currentText) * WEIGHT_NAMED_CURRENT;
    if (mentionScore > 0) addCandidate(id, undefined, 0);
  }

  const sorted = Array.from(candidates.values())
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .slice(0, limit);

  const result: RelatedEntityContext[] = [];
  const debugEntries: Array<{ title: string; score: number; chars: number }> =
    [];
  let totalChars = 0;
  for (const { id, title, type, relation, summary, score } of sorted) {
    // Hard-cap any single entry so even the first can't exceed the total budget.
    const entry =
      summary.length > MAX_TOTAL_CHARS
        ? summary.slice(0, MAX_TOTAL_CHARS) + "..."
        : summary;
    if (result.length > 0 && totalChars + entry.length > MAX_TOTAL_CHARS)
      break;
    result.push({ id, title, type, relation, summary: entry });
    debugEntries.push({ title, score, chars: entry.length });
    totalChars += entry.length;
  }
  debug?.(debugEntries);
  return result;
}
