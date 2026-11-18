import type { AdventureJsonV1 } from "@codex/adventure-engine";

export interface GuardedString {
  recordId: string;
  field: string;
  text: string;
}

const MIN_GUARDED_LENGTH = 12;
// Identifiers, enums and flags are structure, not prose. A rumour's `truth`
// is guarded only in its label forms (see addVerdict), never as a bare word.
const STRUCTURAL_KEYS = new Set([
  "id",
  "visibility",
  "epistemicStatus",
  "anchor",
  "truth",
  "documentHash",
]);
const isStructural = (key: string) =>
  STRUCTURAL_KEYS.has(key) || /(?:Id|Ids)$/.test(key);

type Loose = { id: string; visibility?: string } & Record<string, unknown>;

/** Every string leaf of a record, nested objects and arrays included, with its path. */
function* stringLeaves(
  value: unknown,
  path: string,
): Generator<[string, string]> {
  if (typeof value === "string") yield [path, value];
  else if (Array.isArray(value))
    for (const [i, item] of value.entries())
      yield* stringLeaves(item, `${path}[${i}]`);
  else if (value && typeof value === "object")
    for (const [key, child] of Object.entries(value))
      if (!isStructural(key))
        yield* stringLeaves(child, path ? `${path}.${key}` : key);
}

/** Every string of a package that a player must never be shown. */
export function collectGmOnlyStrings(pkg: AdventureJsonV1): GuardedString[] {
  const found: GuardedString[] = [];
  const add = (recordId: string, field: string, value: unknown) => {
    if (typeof value === "string" && value.trim())
      found.push({ recordId, field, text: value.trim() });
  };
  const addAncillary = (recordId: string, field: string, value: unknown) => {
    if (typeof value === "string" && value.trim().length >= MIN_GUARDED_LENGTH)
      add(recordId, field, value);
  };
  // Rumour truth is guarded in its output labels, never as a bare word.
  const addVerdict = (recordId: string, ...forms: string[]) => {
    for (const text of forms) found.push({ recordId, field: "truth", text });
  };
  const records: Loose[][] = [
    pkg.locations,
    pkg.actors,
    pkg.factions,
    pkg.scenes,
    pkg.encounters,
    pkg.clues,
    pkg.rumours,
    pkg.items,
  ] as unknown as Loose[][];
  for (const record of records.flat()) {
    if (record.visibility !== "gm-only") continue;
    for (const [field, text] of stringLeaves(record, "")) {
      const leaf = field
        .split(".")
        .at(-1)
        ?.replace(/\[\d+\]$/, "");
      if (leaf === "name" || leaf === "title") add(record.id, field, text);
      else addAncillary(record.id, field, text);
    }
  }
  for (const secret of pkg.secrets) add(secret.id, "text", secret.text);
  // Retrieval treats these as GM-only whatever the record's visibility.
  for (const clue of pkg.clues) add(clue.id, "reveals", clue.reveals);
  for (const rumour of pkg.rumours) {
    addVerdict(
      rumour.id,
      `Truth: ${rumour.truth}`,
      `"truth":"${rumour.truth}"`,
    );
  }
  const seen = new Set<string>();
  return found.filter((entry) => {
    const key = `${entry.recordId}\0${entry.field}\0${entry.text}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ");

function stringsOf(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) value.forEach((v) => stringsOf(v, into));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => stringsOf(v, into));
  return into;
}

/** Throws, naming the output, record and field, when `output` holds a guarded string. */
export function assertNoGmLeak(
  guarded: readonly GuardedString[],
  output: unknown,
  label: string,
): void {
  // Raw strings keep real line breaks that JSON.stringify would escape.
  const haystacks =
    typeof output === "string"
      ? [output]
      : [JSON.stringify(output) ?? "", stringsOf(output).join(" ")];
  if (typeof output === "string") {
    try {
      haystacks.push(JSON.stringify(JSON.parse(output)) ?? "");
    } catch {
      // Non-JSON output is checked in its original form above.
    }
  }
  const text = haystacks.map(normalise);
  for (const entry of guarded) {
    const needle = normalise(entry.text);
    if (text.some((h) => h.includes(needle)))
      throw new Error(
        `GM-only leak in "${label}": record ${entry.recordId}, field ${entry.field}`,
      );
  }
}
