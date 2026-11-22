import { MAX_ADVENTURE_RETRIEVAL_CHARS } from "../source-package/retrieval";
import { splitByVisibility } from "./retrieval-format";
import { boundSourceRefQuote, withoutTextQuote } from "./retrieval-source-ref";
import type { AdventureJsonExcerpt } from "./retrieval-types";

export interface ExcerptAdmission {
  excerpts: AdventureJsonExcerpt[];
  /** Ids of admitted records that later tiers and secrets match against. */
  selectedIds: Set<string>;
  seen: Set<string>;
  /** Caps retained excerpt objects while matching records are visited. */
  maxCharacters: number;
  truncated: boolean;
  invalidBudget: boolean;
  stopped: boolean;
}

export function createExcerptAdmission(
  maxCharacters: number,
): ExcerptAdmission {
  return {
    excerpts: [],
    selectedIds: new Set(),
    seen: new Set(),
    maxCharacters,
    truncated: false,
    invalidBudget: false,
    stopped: false,
  };
}

export function clampMaxCharacters(value: number | undefined): number {
  if (value === undefined) return MAX_ADVENTURE_RETRIEVAL_CHARS;
  return Math.min(
    MAX_ADVENTURE_RETRIEVAL_CHARS,
    Math.max(0, Math.floor(Number.isNaN(value) ? 0 : value)),
  );
}

export function serialisedSize(excerpts: AdventureJsonExcerpt[]): number {
  const { playerSafe, gmOnly } = splitByVisibility(excerpts);
  return JSON.stringify(playerSafe).length + JSON.stringify(gmOnly).length;
}

function withoutSourceRef(excerpt: AdventureJsonExcerpt): AdventureJsonExcerpt {
  const { sourceRef: _sourceRef, ...rest } = excerpt;
  void _sourceRef;
  return rest;
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
    const sourceRef = withoutTextQuote(excerpt.sourceRef);
    base = { ...excerpt, sourceRef, text: "" };
    if (sourceRef === undefined) base = withoutSourceRef(base);
  }
  if (
    serialisedSize([{ ...base, text: "" }]) > max &&
    base.sourceRef !== undefined
  ) {
    base = withoutSourceRef(base);
  }
  return base;
}

function withExcerptText(
  excerpt: AdventureJsonExcerpt,
  length: number,
): AdventureJsonExcerpt {
  if (length >= excerpt.text.length) return { ...excerpt, text: excerpt.text };
  if (length <= 0) return { ...excerpt, text: "" };
  let kept = excerpt.text.slice(0, length - 1);
  const last = kept.charCodeAt(kept.length - 1);
  if (last >= 0xd800 && last <= 0xdbff) kept = kept.slice(0, -1);
  return { ...excerpt, text: `${kept}…` };
}

function trimExcerptText(
  excerpt: AdventureJsonExcerpt,
  max: number,
): AdventureJsonExcerpt | undefined {
  let low = 0;
  let high = excerpt.text.length;
  if (serialisedSize([withExcerptText(excerpt, low)]) > max) return undefined;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (serialisedSize([withExcerptText(excerpt, mid)]) <= max) low = mid;
    else high = mid - 1;
  }
  return withExcerptText(excerpt, low);
}

function trimExcerpt(
  excerpt: AdventureJsonExcerpt,
  max: number,
): AdventureJsonExcerpt | undefined {
  return trimExcerptText(trimOptionalSourceRef(excerpt, max), max);
}

function addOversizedExcerpt(
  sel: ExcerptAdmission,
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
  sel: ExcerptAdmission,
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
export function addExcerpts(
  sel: ExcerptAdmission,
  excerpts: AdventureJsonExcerpt | AdventureJsonExcerpt[],
  selectable: boolean,
  focusScene = false,
): void {
  (Array.isArray(excerpts) ? excerpts : [excerpts]).forEach((excerpt, i) =>
    addOne(sel, excerpt, selectable, focusScene && i === 0),
  );
}
