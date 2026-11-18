import type { AdventureJsonV1 } from "@codex/adventure-engine";

export interface GuardedString {
  recordId: string;
  field: string;
  text: string;
}

const MIN_GUARDED_LENGTH = 12;
const TEXT_FIELDS = [
  "name",
  "title",
  "summary",
  "description",
  "text",
  "body",
  "readAloud",
  "motivation",
  "role",
  "disposition",
  "goals",
  "conditions",
] as const;

type Loose = { id: string; visibility?: string } & Record<string, unknown>;

/** Every string of a package that a player must never be shown. */
export function collectGmOnlyStrings(pkg: AdventureJsonV1): GuardedString[] {
  const found: GuardedString[] = [];
  const add = (recordId: string, field: string, value: unknown) => {
    for (const text of Array.isArray(value) ? value : [value]) {
      if (typeof text === "string" && text.trim().length >= MIN_GUARDED_LENGTH)
        found.push({ recordId, field, text: text.trim() });
    }
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
    for (const field of TEXT_FIELDS) add(record.id, field, record[field]);
  }
  for (const secret of pkg.secrets) add(secret.id, "text", secret.text);
  // Retrieval treats these as GM-only whatever the record's visibility.
  for (const clue of pkg.clues) add(clue.id, "reveals", clue.reveals);
  for (const rumour of pkg.rumours) {
    add(rumour.id, "truth", `Truth: ${rumour.truth}`);
    add(rumour.id, "truth", `"truth":"${rumour.truth}"`);
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
  const text = haystacks.map(normalise);
  for (const entry of guarded) {
    const needle = normalise(entry.text);
    if (text.some((h) => h.includes(needle)))
      throw new Error(
        `GM-only leak in "${label}": record ${entry.recordId}, field ${entry.field}`,
      );
  }
}
