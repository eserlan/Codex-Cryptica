import {
  MAX_HISTORICAL_DOCUMENTED_FACTS,
  MAX_HISTORICAL_ENTITY_REFS,
  type AdventureCalendarDate,
  type HistoricalAnchorDocumentedFact,
  type HistoricalAnchorEntityRef,
  type HistoricalEventSnapshot,
} from "./historical-anchor-types";

const MAX_TEXT_CHARS = 600;
// Bound synchronous sentence extraction even when Vault text is unusually large.
const MAX_FACT_SOURCE_CHARS = 64_000;

export function clampText(value: string, max = MAX_TEXT_CHARS): string {
  return value.trim().slice(0, max);
}

export function extractDocumentedFacts(
  event: HistoricalEventSnapshot,
): HistoricalAnchorDocumentedFact[] {
  if (event.documentedFacts && event.documentedFacts.length > 0) {
    return normalizeDocumentedFacts(event.documentedFacts);
  }

  return deriveDocumentedFacts(event);
}

function normalizeDocumentedFacts(
  entries: NonNullable<HistoricalEventSnapshot["documentedFacts"]>,
): HistoricalAnchorDocumentedFact[] {
  const facts: HistoricalAnchorDocumentedFact[] = [];
  const seen = new Set<string>();
  for (const entry of entries) {
    const fact = normalizeDocumentedFact(entry, facts.length + 1);
    if (!fact || seen.has(fact.id)) continue;
    seen.add(fact.id);
    facts.push(fact);
    if (facts.length >= MAX_HISTORICAL_DOCUMENTED_FACTS) break;
  }
  return facts;
}

function normalizeDocumentedFact(
  entry: NonNullable<HistoricalEventSnapshot["documentedFacts"]>[number],
  fallbackIndex: number,
): HistoricalAnchorDocumentedFact | null {
  const text = clampText(typeof entry === "string" ? entry : entry.text);
  if (!text) return null;
  const fallbackId = `anchor-fact-${fallbackIndex}`;
  const id =
    typeof entry === "string"
      ? fallbackId
      : (entry.id?.trim() || fallbackId).slice(0, 160);
  return { id, text };
}

function appendDocumentedFacts(
  source: string,
  maxChars: number,
  facts: HistoricalAnchorDocumentedFact[],
): { scannedChars: number; full: boolean } {
  const boundedSource = source.slice(0, maxChars);
  for (const line of boundedSource.matchAll(/[^\r\n]+|\r?\n+/g)) {
    for (const segment of line[0].split(/(?<=[.!?])\s+/)) {
      const text = clampText(segment);
      if (!text) continue;
      facts.push({ id: `anchor-fact-${facts.length + 1}`, text });
      if (facts.length >= MAX_HISTORICAL_DOCUMENTED_FACTS) {
        return { scannedChars: boundedSource.length, full: true };
      }
    }
  }
  return { scannedChars: boundedSource.length, full: false };
}

function deriveDocumentedFacts(
  event: HistoricalEventSnapshot,
): HistoricalAnchorDocumentedFact[] {
  const facts: HistoricalAnchorDocumentedFact[] = [];
  let scannedChars = 0;
  for (const source of [event.content, event.lore]) {
    if (!source || scannedChars >= MAX_FACT_SOURCE_CHARS) continue;
    const result = appendDocumentedFacts(
      source,
      MAX_FACT_SOURCE_CHARS - scannedChars,
      facts,
    );
    scannedChars += result.scannedChars;
    if (result.full) return facts;
  }
  if (facts.length === 0 && event.title.trim()) {
    return [{ id: "anchor-fact-1", text: clampText(event.title) }];
  }
  return facts;
}

export function normalizeEntityRefs(
  refs: HistoricalAnchorEntityRef[] | undefined,
): HistoricalAnchorEntityRef[] {
  if (!refs || refs.length === 0) return [];
  const normalized: HistoricalAnchorEntityRef[] = [];
  const seen = new Set<string>();
  for (const ref of refs) {
    const normalizedRef = normalizeEntityRef(ref);
    if (!normalizedRef || seen.has(normalizedRef.recordId)) continue;
    seen.add(normalizedRef.recordId);
    normalized.push(normalizedRef);
    if (normalized.length >= MAX_HISTORICAL_ENTITY_REFS) break;
  }
  return normalized;
}

function normalizeEntityRef(
  ref: HistoricalAnchorEntityRef,
): HistoricalAnchorEntityRef | null {
  const recordId = ref.recordId.trim().slice(0, 160);
  const displayName = clampText(ref.displayName);
  if (!recordId || !displayName) return null;
  return {
    recordId,
    displayName,
    ...(ref.recordType?.trim()
      ? { recordType: clampText(ref.recordType) }
      : {}),
    ...(ref.role?.trim() ? { role: clampText(ref.role) } : {}),
  };
}

export function extractEventRawDates(event: HistoricalEventSnapshot): {
  rawStart?: AdventureCalendarDate;
  rawEnd?: AdventureCalendarDate;
} {
  if (event.start_date) {
    return {
      rawStart: event.start_date,
      rawEnd: event.end_date,
    };
  }
  if (event.date) {
    return {
      rawStart: event.date,
      rawEnd: event.end_date,
    };
  }
  if (event.end_date) {
    return {
      rawStart: event.end_date,
      rawEnd: event.end_date,
    };
  }
  return {};
}
