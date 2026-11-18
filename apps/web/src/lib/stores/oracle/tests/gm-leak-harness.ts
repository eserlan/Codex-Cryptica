import {
  adventureJsonHiddenRecordIds,
  createAdventureJsonHiddenIdMatcher,
  MAX_ADVENTURE_RETRIEVAL_CHARS,
  type AdventureJsonV1,
} from "@codex/adventure-engine";

export interface GuardedString {
  recordId: string;
  field: string;
  text: string;
  /** Unset means a plain substring match. */
  match?: "word" | "id";
}

const MIN_GUARDED_LENGTH = 12;
const MIN_QUOTE_WORDS = 8;
/** Generic place words that collide with ordinary narration; never guarded as short names. */
export const SHORT_NAME_ALLOWLIST: ReadonlySet<string> = new Set([
  "door",
  "gate",
  "room",
  "hall",
  "road",
  "path",
  "bridge",
  "cellar",
  "yard",
  "mill",
]);
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

const WORD_PATTERN = /[\p{L}\p{N}]+(?:['\u2019][\p{L}\p{N}]+)*/gu;
const wordsOf = (text: string) => text.toLowerCase().match(WORD_PATTERN) ?? [];

function* runsOf(words: readonly string[]): Generator<string> {
  for (let i = 0; i + MIN_QUOTE_WORDS <= words.length; i++)
    yield words.slice(i, i + MIN_QUOTE_WORDS).join(" ");
}

/** Guarded strings of 8 or more words, mapped to the runs the player side already shows. */
const visibleRunsOf = new WeakMap<GuardedString, ReadonlySet<string>>();

const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const NOT_WORD_BEFORE = "(?<![\\p{L}\\p{N}])";
const NOT_WORD_AFTER = "(?![\\p{L}\\p{N}])";

const readableIdOf = (id: string) => id.replace(/[-_]+/g, " ").trim();
const leafName = (field: string) =>
  field
    .split(".")
    .at(-1)
    ?.replace(/\[\d+\]$/, "");
const anchorOf = (record: Loose) =>
  (record.sourceRef as { anchor?: string } | undefined)?.anchor;

/** Collects guarded strings, keeping each entry's match mode. */
class Collector {
  readonly found: GuardedString[] = [];

  add(
    recordId: string,
    field: string,
    value: unknown,
    match?: GuardedString["match"],
  ) {
    if (typeof value !== "string" || !value.trim()) return;
    const text = value.trim();
    this.found.push(
      match ? { recordId, field, text, match } : { recordId, field, text },
    );
  }

  addAncillary(recordId: string, field: string, value: unknown) {
    if (typeof value === "string" && value.trim().length >= MIN_GUARDED_LENGTH)
      this.add(recordId, field, value);
  }

  addName(recordId: string, field: string, value: string) {
    const name = value.trim();
    if (name.length >= MIN_GUARDED_LENGTH) this.add(recordId, field, name);
    else if (!SHORT_NAME_ALLOWLIST.has(name.toLowerCase()))
      this.add(recordId, field, name, "word");
  }

  addGmOnlyRecord(record: Loose, sharedAnchors: ReadonlySet<string>) {
    const readableId = readableIdOf(record.id);
    if (
      readableId.split(/\s+/).length >= 2 &&
      readableId.length >= MIN_GUARDED_LENGTH
    )
      this.add(record.id, "id", readableId, "id");
    const anchor = anchorOf(record);
    if (anchor && !sharedAnchors.has(anchor.toLowerCase()))
      this.add(record.id, "sourceRef.anchor", anchor);
  }

  addGmOnlyLeaves(record: Loose) {
    for (const [field, text] of stringLeaves(record, "")) {
      const leaf = leafName(field);
      if (leaf === "name" || leaf === "title")
        this.addName(record.id, field, text);
      else this.addAncillary(record.id, field, text);
    }
  }

  unique(): GuardedString[] {
    const seen = new Set<string>();
    return this.found.filter((entry) => {
      const key = `${entry.recordId}\0${entry.field}\0${entry.text}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}

function addPackageWideStrings(out: Collector, pkg: AdventureJsonV1) {
  for (const secret of pkg.secrets) out.add(secret.id, "text", secret.text);
  // Retrieval treats these as GM-only whatever the record's visibility.
  for (const clue of pkg.clues) out.add(clue.id, "reveals", clue.reveals);
  // Rumour truth is guarded in its output labels, never as a bare word.
  for (const rumour of pkg.rumours)
    for (const text of [`Truth: ${rumour.truth}`, `"truth":"${rumour.truth}"`])
      out.found.push({ recordId: rumour.id, field: "truth", text });
}

function addVisibleRuns(visibleRuns: Set<string>, text: string): void {
  for (const run of runsOf(wordsOf(text))) visibleRuns.add(run);
}

function guardOrAllowLeaf(
  out: Collector,
  visibleRuns: Set<string>,
  recordId: string,
  field: string,
  text: string,
  namesHiddenId: (text: string) => boolean,
): void {
  if (namesHiddenId(text)) {
    out.add(recordId, field, text);
  } else if (field !== "reveals") {
    addVisibleRuns(visibleRuns, text);
  }
}

type CompanionGroup = {
  label: "Connection" | "Branch" | "Alternative solution";
  fields: Array<[field: string, text: string]>;
};

function guardOrAllowComponentGroup(
  out: Collector,
  visibleRuns: Set<string>,
  recordId: string,
  group: CompanionGroup,
  namesHiddenId: (text: string) => boolean,
): void {
  // Retrieval tests buildText([line], MAX + 1), whose limit is MAX + 2.
  // Include the label and separators, but never match an ID beyond that bound.
  const componentsText = group.fields.map(([, text]) => text).join("; ");
  const lineText = `${group.label}: ${componentsText}`;
  const matchableLine = lineText.slice(0, MAX_ADVENTURE_RETRIEVAL_CHARS + 2);
  const movedToCompanion = namesHiddenId(matchableLine);
  for (const [field, text] of group.fields) {
    if (movedToCompanion) out.add(recordId, field, text);
    else addVisibleRuns(visibleRuns, text);
  }
}

/** Guards player-visible lines that name a hidden ID and collects the runs the player side shows. */
function addCompanionLines(
  out: Collector,
  pkg: AdventureJsonV1,
  visible: readonly Loose[],
): Set<string> {
  // The line retrieval moves into a GM-only companion excerpt.
  const namesHiddenId = createAdventureJsonHiddenIdMatcher(
    adventureJsonHiddenRecordIds(pkg),
  );
  const visibleRuns = new Set<string>();
  for (const record of visible) {
    const companionComponents = composedCompanionComponents(record);
    const composedFields = new Set(
      companionComponents.flatMap((group) =>
        group.fields.map(([field]) => field),
      ),
    );
    for (const [field, text] of stringLeaves(record, "")) {
      // Retrieval removes this provenance quote from player-visible excerpts.
      if (field === "sourceRef.textQuote") continue;
      if (!composedFields.has(field)) {
        guardOrAllowLeaf(
          out,
          visibleRuns,
          record.id,
          field,
          text,
          namesHiddenId,
        );
      }
    }
    for (const group of companionComponents) {
      guardOrAllowComponentGroup(
        out,
        visibleRuns,
        record.id,
        group,
        namesHiddenId,
      );
    }
  }
  return visibleRuns;
}

function addStringField(
  fields: Array<[string, string]>,
  field: string,
  value: unknown,
): void {
  if (typeof value === "string") fields.push([field, value]);
}

function connectionComponentFields(
  connection: unknown,
  index: number,
): Array<[string, string]> {
  if (!connection || typeof connection !== "object") return [];
  const entry = connection as {
    description?: unknown;
    travelConditions?: unknown;
  };
  const fields: Array<[string, string]> = [];
  addStringField(
    fields,
    `connections[${index}].description`,
    entry.description,
  );
  if (Array.isArray(entry.travelConditions)) {
    entry.travelConditions.forEach((condition, conditionIndex) => {
      addStringField(
        fields,
        `connections[${index}].travelConditions[${conditionIndex}]`,
        condition,
      );
    });
  }
  return fields;
}

function branchComponentFields(
  branch: unknown,
  index: number,
): Array<[string, string]> {
  if (!branch || typeof branch !== "object") return [];
  const entry = branch as { description?: unknown; condition?: unknown };
  const fields: Array<[string, string]> = [];
  addStringField(fields, `branches[${index}].description`, entry.description);
  addStringField(fields, `branches[${index}].condition`, entry.condition);
  return fields;
}

function alternativeSolutionComponentFields(
  solution: unknown,
  index: number,
): Array<[string, string]> {
  if (!solution || typeof solution !== "object") return [];
  const entry = solution as { method?: unknown; description?: unknown };
  const fields: Array<[string, string]> = [];
  addStringField(fields, `alternativeSolutions[${index}].method`, entry.method);
  addStringField(
    fields,
    `alternativeSolutions[${index}].description`,
    entry.description,
  );
  return fields;
}

function extractCompanionGroups(
  items: unknown,
  label: CompanionGroup["label"],
  extractFields: (item: unknown, index: number) => Array<[string, string]>,
): CompanionGroup[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item, index) => ({ label, fields: extractFields(item, index) }))
    .filter((group) => group.fields.length > 0);
}

/** Source fields retrieval joins into one line before applying the hidden-ID rule. */
function composedCompanionComponents(record: Loose): CompanionGroup[] {
  return [
    ...extractCompanionGroups(
      record.connections,
      "Connection",
      connectionComponentFields,
    ),
    ...extractCompanionGroups(record.branches, "Branch", branchComponentFields),
    ...extractCompanionGroups(
      record.alternativeSolutions,
      "Alternative solution",
      alternativeSolutionComponentFields,
    ),
  ];
}

/** Every string of a package that a player must never be shown. */
export function collectGmOnlyStrings(pkg: AdventureJsonV1): GuardedString[] {
  const out = new Collector();
  const records = [
    pkg.locations,
    pkg.actors,
    pkg.factions,
    pkg.scenes,
    pkg.encounters,
    pkg.clues,
    pkg.rumours,
    pkg.items,
    pkg.secrets,
  ].flat() as unknown as Loose[];
  const visible = records.filter((r) => r.visibility === "player-visible");
  // The player side already shares these, so a GM-only anchor equal to one is no spoiler.
  const sharedAnchors = new Set(
    visible
      .flatMap((r) => [r.id, anchorOf(r)])
      .flatMap((a) => (a ? [a.toLowerCase()] : [])),
  );
  const secretRecords = new Set<unknown>(pkg.secrets);
  for (const record of records) {
    if (record.visibility !== "gm-only") continue;
    out.addGmOnlyRecord(record, sharedAnchors);
    // A secret's own prose is added below; its other fields only repeat visible context.
    if (!secretRecords.has(record)) out.addGmOnlyLeaves(record);
  }
  addPackageWideStrings(out, pkg);
  const visibleRuns = addCompanionLines(out, pkg, visible);
  const unique = out.unique();
  for (const entry of unique)
    if (!entry.match && entry.field !== "truth")
      visibleRunsOf.set(entry, visibleRuns);
  return unique;
}

const normalise = (text: string) => text.toLowerCase().replace(/\s+/g, " ");

function stringsOf(value: unknown, into: string[] = []): string[] {
  if (typeof value === "string") into.push(value);
  else if (Array.isArray(value)) value.forEach((v) => stringsOf(v, into));
  else if (value && typeof value === "object")
    Object.values(value).forEach((v) => stringsOf(v, into));
  return into;
}

interface OutputForms {
  /** Normalised strings searched for substrings and word matches. */
  text: string[];
  /** Every 8-word run of the output's words. */
  runs: Set<string>;
}

function outputForms(output: unknown): OutputForms {
  // Raw strings keep real line breaks that JSON.stringify would escape.
  const haystacks =
    typeof output === "string"
      ? [output]
      : [JSON.stringify(output) ?? "", stringsOf(output).join(" ")];
  const wordTexts =
    typeof output === "string" ? [output] : [stringsOf(output).join(" ")];
  if (typeof output === "string") {
    try {
      const parsed: unknown = JSON.parse(output);
      haystacks.push(JSON.stringify(parsed) ?? "");
      wordTexts.push(stringsOf(parsed).join(" "));
    } catch {
      // Non-JSON output is checked in its original form above.
    }
  }
  return {
    text: haystacks.map(normalise),
    runs: new Set(wordTexts.flatMap((t) => [...runsOf(wordsOf(t))])),
  };
}

function matchesEntry(entry: GuardedString, text: readonly string[]): boolean {
  const needle = normalise(entry.text);
  if (!entry.match) return text.some((h) => h.includes(needle));
  const separator = entry.match === "id" ? "[\\s_-]+" : "[^\\p{L}\\p{N}]+";
  const body = needle.split(" ").map(escapeRegExp).join(separator);
  const pattern = new RegExp(`${NOT_WORD_BEFORE}${body}${NOT_WORD_AFTER}`, "u");
  return text.some((h) => pattern.test(h));
}

function quotesEntry(entry: GuardedString, outputRuns: ReadonlySet<string>) {
  const visibleRuns = visibleRunsOf.get(entry);
  if (!visibleRuns) return false;
  return [...runsOf(wordsOf(entry.text))].some(
    (run) => outputRuns.has(run) && !visibleRuns.has(run),
  );
}

/**
 * Throws, naming the output, record and field, when `output` holds a guarded string.
 * Run it on player-visible outputs only: GM-only IDs, anchors and prose are
 * guarded, so internal or GM-only state (prompts, `hiddenState`) would fail.
 */
export function assertNoGmLeak(
  guarded: readonly GuardedString[],
  output: unknown,
  label: string,
): void {
  const forms = outputForms(output);
  for (const entry of guarded) {
    const suffix = matchesEntry(entry, forms.text)
      ? ""
      : quotesEntry(entry, forms.runs)
        ? " (partial quote)"
        : undefined;
    if (suffix !== undefined)
      throw new Error(
        `GM-only leak in "${label}": record ${entry.recordId}, field ${entry.field}${suffix}`,
      );
  }
}
