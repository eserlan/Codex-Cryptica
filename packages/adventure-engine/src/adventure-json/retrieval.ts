import type {
  AdventureJsonExcerpt,
  AdventureJsonExcerptKind,
  AdventureJsonRetrievalFocus,
  AdventureJsonRetrievalResult,
} from "./retrieval-types";
import {
  adventureJsonHiddenRecordIds,
  createAdventureJsonHiddenIdMatcher,
} from "./retrieval-privacy";
export type {
  AdventureJsonExcerpt,
  AdventureJsonExcerptKind,
  AdventureJsonRetrievalFocus,
  AdventureJsonRetrievalResult,
} from "./retrieval-types";
export {
  adventureJsonRecordIds,
  adventureJsonHiddenRecordIds,
  adventureJsonGmOnlyText,
  createAdventureJsonHiddenIdMatcher,
} from "./retrieval-privacy";
export { formatAdventureJsonExcerpts } from "./retrieval-format";
import { MAX_ADVENTURE_RETRIEVAL_CHARS } from "../source-package/retrieval";
import { entrySceneId } from "./entry-scene";
import type {
  AdventureJsonEncounter,
  AdventureJsonLocation,
  AdventureJsonScene,
  AdventureJsonV1,
  EpistemicStatus,
  Visibility,
  SourceReference,
} from "./schema";

/** `secret` marks a line that is always GM-only, whatever its record's visibility. */
type Line = [
  label: string,
  value: string | Iterable<string> | undefined,
  secret?: true,
  referenceIds?: readonly string[],
];

function referenceLine(label: string, id: string | undefined): Line {
  return [label, id, undefined, id === undefined ? [] : [id]];
}

function referenceLines(label: string, ids: string[] | undefined): Line {
  return [label, ids, undefined, ids];
}

/**
 * Joins labelled lines, copying at most `cap + 1` characters of source text.
 * One character over the cap is enough for admission to see that the excerpt
 * does not fit and to trim it, so oversized package fields (an unbounded scene
 * `body`, say) are never copied or serialised in full.
 */
function buildText(lines: Iterable<Line>, cap: number): string {
  const out = new BoundedText(cap + 1);
  for (const [label, value] of lines) {
    if (out.full) break;
    const parts = lineParts(value);
    appendLine(out, label, parts);
  }
  return out.text;
}

/** A string that stops growing once it reaches `limit` characters. */
class BoundedText {
  text = "";
  constructor(private readonly limit: number) {}

  get full(): boolean {
    return this.text.length >= this.limit;
  }

  append(s: string): void {
    if (!this.full) this.text += s.slice(0, this.limit - this.text.length);
  }
}

function lineParts(value: Line[1]): Iterable<string> {
  if (value === undefined) return [];
  return typeof value === "string" ? [value] : value;
}

function appendLine(
  out: BoundedText,
  label: string,
  parts: Iterable<string>,
): void {
  const iterator = parts[Symbol.iterator]();
  const firstPart = iterator.next();
  if (firstPart.done) return;
  if (out.text.length > 0) out.append("\n");
  out.append(`${label}: `);
  out.append(firstPart.value);
  for (;;) {
    const next = iterator.next();
    if (next.done) break;
    if (out.full) break;
    out.append("; ");
    out.append(next.value);
  }
}

function boundSourceRef(
  sourceRef: SourceReference | undefined,
  cap: number,
): SourceReference | undefined {
  if (sourceRef === undefined) return undefined;
  // `chapter`, `section`, `anchor`, and `textQuote` have no schema-level
  // length limit. Bound them before JSON.stringify so oversized metadata
  // cannot stall serialisation. `textQuote` uses `cap / 8` (room for JSON
  // escaping) so it can be clipped in place; the other fields use `cap + 1`
  // so oversized values still exceed the budget and get dropped cleanly.
  const boundedFields = boundLongSourceFields(sourceRef, cap + 1);
  const boundedQuote = boundSourceQuote(sourceRef, Math.floor(cap / 8));
  if (boundedQuote === undefined) return boundedFields ?? sourceRef;
  return { ...(boundedFields ?? sourceRef), textQuote: boundedQuote };
}

function boundLongSourceFields(
  sourceRef: SourceReference,
  limit: number,
): SourceReference | undefined {
  let bounded: SourceReference | undefined;
  for (const key of ["chapter", "section", "anchor"] as const) {
    const value = sourceRef[key];
    if (value === undefined || value.length <= limit) continue;
    bounded ??= { ...sourceRef };
    bounded[key] = value.slice(0, limit);
  }
  return bounded;
}

function boundSourceQuote(
  sourceRef: SourceReference,
  limit: number,
): string | undefined {
  const quote = sourceRef.textQuote;
  return quote !== undefined && quote.length > limit + 1
    ? quote.slice(0, limit + 1)
    : undefined;
}

/**
 * Builds a record excerpt, moving secret lines and structured references to
 * hidden records into an immediately following GM-only companion.
 */
function recordExcerpts(
  hiddenIds: ReadonlySet<string>,
  kind: AdventureJsonExcerptKind,
  record: {
    id: string;
    visibility: Visibility;
    epistemicStatus: EpistemicStatus;
    sourceRef?: SourceReference;
  },
  lines: Iterable<Line>,
  cap: number,
): AdventureJsonExcerpt[] {
  const boundedSourceRef = boundSourceRef(record.sourceRef, cap);
  const excerpt = (visibility: Visibility, from: Iterable<Line>) => {
    const sourceRef =
      boundedSourceRef === undefined
        ? undefined
        : visibility === "player-visible"
          ? withoutTextQuote(boundedSourceRef)
          : boundedSourceRef;
    return {
      id: record.id,
      kind,
      visibility,
      epistemicStatus: record.epistemicStatus,
      ...(sourceRef !== undefined ? { sourceRef } : {}),
      text: buildText(from, cap),
    };
  };
  // A record that is not player-visible is GM-only as a whole: stream it in.
  if (record.visibility !== "player-visible") {
    return [excerpt(record.visibility, lines)];
  }
  const { kept, companion } = splitRecordLines(hiddenIds, lines, cap);
  if (companion.lines.length === 0) {
    return [excerpt(record.visibility, kept.lines)];
  }
  return [
    excerpt(record.visibility, kept.lines),
    excerpt("gm-only", companion.lines),
  ];
}

function splitRecordLines(
  hiddenIds: ReadonlySet<string>,
  lines: Iterable<Line>,
  cap: number,
): { kept: SplitText; companion: SplitText } {
  // One pass splits the lines. Once the player-visible text is over `cap`,
  // admission trims or drops it and skips its companion, so reading stops
  // there; oversized or lazily built fields are never read in full. A part
  // that is never read is in neither text, so it cannot leak.
  const limit = cap + 1;
  const kept = new SplitText();
  const companion = new SplitText();
  for (const raw of lines) {
    if (kept.length >= limit) break;
    if (isStructuredSecret(raw, hiddenIds) && companion.length >= limit) {
      continue;
    }
    const line = readLine(raw, limit);
    const alreadyMoved = shouldMoveLine(raw, line, hiddenIds);
    if (alreadyMoved && companion.length >= limit) continue;
    const moved = alreadyMoved;
    if (!moved) kept.push(line);
    else if (companion.length < limit) companion.push(line);
  }
  return { kept, companion };
}

function isStructuredSecret(
  line: Line,
  hiddenIds: ReadonlySet<string>,
): boolean {
  return line[2] === true || (line[3] ?? []).some((id) => hiddenIds.has(id));
}

function shouldMoveLine(
  raw: Line,
  boundedLine: Line,
  hiddenIds: ReadonlySet<string>,
): boolean {
  return (
    isStructuredSecret(raw, hiddenIds) ||
    lineMentionsHiddenId(boundedLine, hiddenIds)
  );
}

function lineMentionsHiddenId(
  line: Line,
  hiddenIds: ReadonlySet<string>,
): boolean {
  if (hiddenIds.size === 0) return false;
  const matcher = hiddenIdMatcher(hiddenIds);
  return matcher(buildText([line], MAX_ADVENTURE_RETRIEVAL_CHARS + 1));
}

const hiddenIdMatchers = new WeakMap<
  ReadonlySet<string>,
  (text: string) => boolean
>();

function hiddenIdMatcher(ids: ReadonlySet<string>): (text: string) => boolean {
  const cached = hiddenIdMatchers.get(ids);
  if (cached) return cached;
  const matcher = createAdventureJsonHiddenIdMatcher(ids);
  hiddenIdMatchers.set(ids, matcher);
  return matcher;
}

/** Lines bound for one excerpt, with the length `buildText` would give them. */
class SplitText {
  lines: Line[] = [];
  length = 0;

  push(line: Line): void {
    const parts = line[1] as string[] | string | undefined;
    if (parts === undefined || parts.length === 0) return;
    const list = typeof parts === "string" ? [parts] : parts;
    if (this.length > 0) this.length += 1;
    this.length += line[0].length + 2;
    list.forEach((part, i) => (this.length += part.length + (i > 0 ? 2 : 0)));
    this.lines.push(line);
  }
}

/** Reads a line's parts into an array, stopping once they exceed `limit`. */
function readLine(
  [label, value, secret, referenceIds]: Line,
  limit: number,
): Line {
  let parts: string | string[] | undefined;
  if (value === undefined || typeof value === "string") {
    parts = value;
  } else {
    parts = [];
    let length = 0;
    for (const part of value) {
      parts.push(part);
      length += part.length + 2;
      if (length > limit) break;
    }
  }
  return [label, parts, secret, referenceIds];
}

function withoutTextQuote(
  sourceRef: SourceReference,
): SourceReference | undefined {
  if (sourceRef.textQuote === undefined) return sourceRef;
  const { textQuote: _textQuote, ...safeSourceRef } = sourceRef;
  void _textQuote;
  return Object.keys(safeSourceRef).length ? safeSourceRef : undefined;
}

function clampMaxCharacters(value: number | undefined): number {
  if (value === undefined) return MAX_ADVENTURE_RETRIEVAL_CHARS;
  return Math.min(
    MAX_ADVENTURE_RETRIEVAL_CHARS,
    Math.max(0, Math.floor(Number.isNaN(value) ? 0 : value)),
  );
}

function splitByVisibility(excerpts: AdventureJsonExcerpt[]): {
  playerSafe: AdventureJsonExcerpt[];
  gmOnly: AdventureJsonExcerpt[];
} {
  return {
    playerSafe: excerpts.filter((e) => e.visibility === "player-visible"),
    gmOnly: excerpts.filter((e) => e.visibility !== "player-visible"),
  };
}

function serialisedSize(excerpts: AdventureJsonExcerpt[]): number {
  const { playerSafe, gmOnly } = splitByVisibility(excerpts);
  return JSON.stringify(playerSafe).length + JSON.stringify(gmOnly).length;
}

function trimOptionalSourceRef(
  excerpt: AdventureJsonExcerpt,
  max: number,
): AdventureJsonExcerpt {
  let base = excerpt;
  if (
    serialisedSize([{ ...excerpt, text: "" }]) > max &&
    excerpt.sourceRef?.textQuote !== undefined
  ) {
    // The focus scene's optional quote must not make its required envelope
    // impossible to admit. Keep other source-reference metadata intact.
    const { textQuote: _textQuote, ...sourceRef } = excerpt.sourceRef;
    void _textQuote;
    base = { ...excerpt, sourceRef, text: "" };
    if (Object.keys(sourceRef).length === 0) {
      const { sourceRef: _sourceRef, ...withoutSourceRef } = base;
      void _sourceRef;
      base = withoutSourceRef;
    }
  }
  if (
    serialisedSize([{ ...base, text: "" }]) > max &&
    base.sourceRef !== undefined
  ) {
    const { sourceRef: _sourceRef, ...withoutSourceRef } = base;
    void _sourceRef;
    base = withoutSourceRef;
  }
  return base;
}

function trimExcerptText(
  excerpt: AdventureJsonExcerpt,
  max: number,
): AdventureJsonExcerpt | undefined {
  const withText = (length: number): AdventureJsonExcerpt => {
    if (length >= excerpt.text.length)
      return { ...excerpt, text: excerpt.text };
    if (length <= 0) return { ...excerpt, text: "" };
    let kept = excerpt.text.slice(0, length - 1);
    const last = kept.charCodeAt(kept.length - 1);
    if (last >= 0xd800 && last <= 0xdbff) kept = kept.slice(0, -1);
    return { ...excerpt, text: `${kept}…` };
  };
  let low = 0;
  let high = excerpt.text.length;
  if (serialisedSize([withText(low)]) > max) return undefined;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (serialisedSize([withText(mid)]) <= max) low = mid;
    else high = mid - 1;
  }
  return withText(low);
}

function trimExcerpt(
  excerpt: AdventureJsonExcerpt,
  max: number,
): AdventureJsonExcerpt | undefined {
  return trimExcerptText(trimOptionalSourceRef(excerpt, max), max);
}

function boundSourceRefQuote(
  excerpt: AdventureJsonExcerpt,
  maxCharacters: number,
): { excerpt: AdventureJsonExcerpt; truncated: boolean } {
  const quote = excerpt.sourceRef?.textQuote;
  const limit = Math.floor(maxCharacters / 8);
  if (quote === undefined || quote.length <= limit) {
    return { excerpt, truncated: false };
  }
  return {
    excerpt: {
      ...excerpt,
      sourceRef: { ...excerpt.sourceRef!, textQuote: quote.slice(0, limit) },
    },
    truncated: true,
  };
}

interface Selection {
  pkg: AdventureJsonV1;
  scene: AdventureJsonScene;
  locationId: string | undefined;
  excerpts: AdventureJsonExcerpt[];
  /** Ids of selected records that later tiers and secrets match against. */
  selectedIds: Set<string>;
  /** Ids of every package record that is not player-visible. */
  hiddenIds: Set<string>;
  actorIds: Set<string>;
  seen: Set<string>;
  /** Caps retained excerpt objects while matching records are visited. */
  maxCharacters: number;
  truncated: boolean;
  invalidBudget: boolean;
  stopped: boolean;
}

function addOversizedExcerpt(
  sel: Selection,
  excerpt: AdventureJsonExcerpt,
  selectable: boolean,
  focusScene: boolean,
): void {
  sel.truncated = true;
  if (!focusScene) {
    sel.stopped = true;
    return;
  }
  const trimmed = trimExcerpt(excerpt, sel.maxCharacters);
  if (!trimmed) {
    sel.invalidBudget = true;
    sel.stopped = true;
    return;
  }
  sel.excerpts.push(trimmed);
  sel.stopped = true;
  if (selectable) sel.selectedIds.add(trimmed.id);
}

function addOne(
  sel: Selection,
  excerpt: AdventureJsonExcerpt,
  selectable: boolean,
  focusScene: boolean,
): void {
  if (sel.invalidBudget) return;
  if (sel.stopped) return;
  const bounded = boundSourceRefQuote(excerpt, sel.maxCharacters);
  excerpt = bounded.excerpt;
  sel.truncated ||= bounded.truncated;
  const key = `${excerpt.kind}:${excerpt.id}:${excerpt.visibility}`;
  if (sel.seen.has(key)) return;
  sel.seen.add(key);
  const candidate = [...sel.excerpts, excerpt];
  if (serialisedSize(candidate) > sel.maxCharacters) {
    addOversizedExcerpt(sel, excerpt, selectable, focusScene);
    return;
  }
  sel.excerpts.push(excerpt);
  if (selectable) sel.selectedIds.add(excerpt.id);
}

/** Adds a record's excerpt and, directly after it, its GM-only companion. */
function add(
  sel: Selection,
  excerpts: AdventureJsonExcerpt | AdventureJsonExcerpt[],
  selectable: boolean,
  focusScene = false,
): void {
  (Array.isArray(excerpts) ? excerpts : [excerpts]).forEach((excerpt, i) =>
    addOne(sel, excerpt, selectable, focusScene && i === 0),
  );
}

function addScene(sel: Selection): void {
  if (sel.stopped) return;
  const scene = sel.scene;
  add(
    sel,
    recordExcerpts(
      sel.hiddenIds,
      "scene",
      scene,
      (function* (): Iterable<Line> {
        yield ["Title", scene.title];
        yield ["Summary", scene.summary];
        yield referenceLine("Location", scene.locationId);
        yield [
          "Read aloud",
          typeof scene.readAloud === "string"
            ? [scene.readAloud]
            : scene.readAloud,
        ];
        yield ["Body", scene.body];
        yield ["Conditions", scene.conditions];
        for (const b of scene.branches ?? []) {
          yield referenceLine("Branch target", b.targetSceneId);
          yield [
            "Branch",
            [b.description, ...(b.condition ? [b.condition] : [])],
          ];
        }
      })(),
      sel.maxCharacters,
    ),
    true,
    true,
  );
}

function range(min?: number, max?: number): string | undefined {
  if (min === undefined && max === undefined) return undefined;
  return `${min ?? "?"}-${max ?? "?"}`;
}

function addPremiseAndSystem(sel: Selection): void {
  if (sel.stopped) return;
  const { premise, system } = sel.pkg;
  add(
    sel,
    {
      id: "premise",
      kind: "premise",
      visibility: "player-visible",
      epistemicStatus: "explicit",
      text: buildText(
        [
          ["Background", premise.background],
          ["Hook", premise.hook],
          ["Theme", premise.theme],
          ["Tone", premise.tone],
        ],
        sel.maxCharacters,
      ),
    },
    false,
  );
  if (!system || sel.stopped) return;
  const target = system.targetParty;
  add(
    sel,
    {
      id: "system",
      kind: "system",
      visibility: "player-visible",
      epistemicStatus: "explicit",
      text: buildText(
        [
          ["Name", system.name],
          ["Party size", range(target?.sizeMin, target?.sizeMax)],
          ["Party level", range(target?.levelMin, target?.levelMax)],
        ],
        sel.maxCharacters,
      ),
    },
    false,
  );
}

function addLocation(sel: Selection, location: AdventureJsonLocation): void {
  if (sel.stopped) return;
  add(
    sel,
    recordExcerpts(
      sel.hiddenIds,
      "location",
      location,
      (function* (): Iterable<Line> {
        yield ["Name", location.name];
        yield ["Summary", location.summary];
        yield ["Description", location.description];
        yield referenceLine("Parent location", location.parentLocationId);
        for (const c of location.connections ?? []) {
          yield referenceLine("Connection target", c.targetLocationId);
          yield [
            "Connection",
            [c.description, ...(c.travelConditions ?? [])].filter(
              (value): value is string => value !== undefined,
            ),
          ];
        }
      })(),
      sel.maxCharacters,
    ),
    true,
  );
}

function addEncounters(sel: Selection): AdventureJsonEncounter[] {
  const encounters: AdventureJsonEncounter[] = [];
  for (const e of sel.pkg.encounters) {
    if (sel.stopped) break;
    if (
      e.sceneId !== sel.scene.id &&
      !(sel.locationId !== undefined && e.locationId === sel.locationId)
    )
      continue;
    const before = sel.excerpts.length;
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "encounter",
        e,
        (function* (): Iterable<Line> {
          yield ["Title", e.title];
          yield referenceLine("Scene", e.sceneId);
          yield referenceLine("Location", e.locationId);
          yield ["Description", e.description];
          yield ["Conditions", e.conditions];
          yield referenceLines("Actors", e.actorIds);
          for (const solution of e.alternativeSolutions) {
            yield [
              "Alternative solution",
              [solution.method, solution.description],
            ];
          }
        })(),
        sel.maxCharacters,
      ),
      true,
    );
    if (sel.excerpts.length > before) encounters.push(e);
  }
  return encounters;
}

function addActors(
  sel: Selection,
  focusActorIds: string[] | undefined,
  encounters: AdventureJsonEncounter[],
): void {
  const wanted = new Set([
    ...(focusActorIds ?? []),
    ...encounters.flatMap((e) => e.actorIds ?? []),
  ]);
  for (const a of sel.pkg.actors) {
    if (sel.stopped) break;
    const atLocation =
      sel.locationId !== undefined && a.locationId === sel.locationId;
    if (!wanted.has(a.id) && !atLocation) continue;
    sel.actorIds.add(a.id);
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "actor",
        a,
        [
          ["Name", a.name],
          ["Summary", a.summary],
          ["Description", a.description],
          ["Role", a.role],
          ["Motivation", a.motivation],
          ["Disposition", a.disposition],
          referenceLine("Faction", a.factionId),
          referenceLine("Location", a.locationId),
        ],
        sel.maxCharacters,
      ),
      true,
    );
  }
}

function addClues(sel: Selection): void {
  for (const c of sel.pkg.clues) {
    if (sel.stopped) break;
    const matches =
      c.placedSceneId === sel.scene.id ||
      (c.placedLocationId !== undefined &&
        c.placedLocationId === sel.locationId) ||
      (c.placedActorId !== undefined && sel.actorIds.has(c.placedActorId));
    if (!matches) continue;
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "clue",
        c,
        [
          ["Text", c.text],
          ["Reveals", c.reveals, true],
          referenceLine("Lead target", c.leadTargetId),
          referenceLine("Placed scene", c.placedSceneId),
          referenceLine("Placed location", c.placedLocationId),
          referenceLine("Placed actor", c.placedActorId),
          referenceLine("Alternative source", c.alternativeSourceId),
        ],
        sel.maxCharacters,
      ),
      true,
    );
  }
}

function addItems(sel: Selection): void {
  for (const i of sel.pkg.items) {
    if (sel.stopped) break;
    const matches =
      (i.locationId !== undefined && i.locationId === sel.locationId) ||
      (i.actorId !== undefined && sel.actorIds.has(i.actorId));
    if (!matches) continue;
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "item",
        i,
        [
          ["Name", i.name],
          ["Summary", i.summary],
          ["Description", i.description],
          referenceLine("Location", i.locationId),
          referenceLine("Actor", i.actorId),
        ],
        sel.maxCharacters,
      ),
      true,
    );
  }
}

function addRumours(sel: Selection): void {
  const anchors = new Set<string>([sel.scene.id, ...sel.actorIds]);
  if (sel.locationId !== undefined) anchors.add(sel.locationId);
  for (const r of sel.pkg.rumours) {
    if (sel.stopped) break;
    const refs = [r.sourceActorId, r.sourceLocationId, r.targetEntityId];
    if (!refs.some((id) => id !== undefined && anchors.has(id))) continue;
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "rumour",
        r,
        [
          ["Text", r.text],
          ["Truth", r.truth, true],
          referenceLine("Source actor", r.sourceActorId),
          referenceLine("Source location", r.sourceLocationId),
          referenceLine("Target", r.targetEntityId),
        ],
        sel.maxCharacters,
      ),
      true,
    );
  }
}

function addSecrets(sel: Selection): void {
  for (const s of sel.pkg.secrets) {
    if (sel.stopped) break;
    if (!(s.relatedEntityIds ?? []).some((id) => sel.selectedIds.has(id))) {
      continue;
    }
    add(
      sel,
      recordExcerpts(
        sel.hiddenIds,
        "secret",
        s,
        [["Text", s.text], referenceLines("Related", s.relatedEntityIds)],
        sel.maxCharacters,
      ),
      false,
    );
  }
}

function selectExcerpts(
  pkg: AdventureJsonV1,
  focus: AdventureJsonRetrievalFocus,
  sceneId: string,
  maxCharacters: number,
): Selection {
  // Matching requires one in-memory pass over each package tier. Admission
  // happens as records are visited so excerpts and serialized prefixes never
  // accumulate beyond the output budget.
  const scene = pkg.scenes.find((s) => s.id === sceneId)!;
  const location =
    pkg.locations.find((l) => l.id === focus.locationId) ??
    pkg.locations.find((l) => l.id === scene.locationId);
  const sel: Selection = {
    pkg,
    scene,
    locationId: location?.id,
    excerpts: [],
    selectedIds: new Set(),
    hiddenIds: new Set(adventureJsonHiddenRecordIds(pkg)),
    actorIds: new Set(),
    seen: new Set(),
    maxCharacters,
    truncated: false,
    invalidBudget: false,
    stopped: false,
  };

  addScene(sel);
  addPremiseAndSystem(sel);
  if (location) addLocation(sel, location);
  const encounters = addEncounters(sel);
  addActors(sel, focus.actorIds, encounters);
  addClues(sel);
  addItems(sel);
  addRumours(sel);
  addSecrets(sel);
  return sel;
}

function resolveFocusScene(
  pkg: AdventureJsonV1,
  requested: string | undefined,
): string | undefined {
  return requested !== undefined && pkg.scenes.some((s) => s.id === requested)
    ? requested
    : entrySceneId(pkg);
}

/**
 * Pure, deterministic scene-context retrieval for Adventure JSON v1. Selects
 * the focus scene and the records tied to it, splits them by visibility and
 * keeps the serialised size within `maxCharacters`.
 */
export function retrieveAdventureJsonContext(
  pkg: AdventureJsonV1,
  focus: AdventureJsonRetrievalFocus,
): AdventureJsonRetrievalResult {
  const resolved = resolveFocusScene(pkg, focus.sceneId);
  const sceneFallback =
    focus.sceneId !== undefined && resolved !== focus.sceneId;

  if (resolved === undefined) {
    return {
      playerSafe: [],
      gmOnly: [],
      includedIds: [],
      truncated: false,
      sceneFallback,
      invalidBudget: false,
    };
  }

  const selection = selectExcerpts(
    pkg,
    focus,
    resolved,
    clampMaxCharacters(focus.maxCharacters),
  );
  const kept = selection.excerpts;

  return {
    ...splitByVisibility(kept),
    includedIds: [...new Set(kept.map((e) => e.id))],
    truncated: selection.truncated,
    sceneFallback,
    invalidBudget: selection.invalidBudget,
  };
}
