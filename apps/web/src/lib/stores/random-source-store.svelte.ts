import {
  parseRandomSource,
  serialiseRandomSource,
  validateSource,
  RandomSourceEngine,
  type Diagnostic,
  type RandomSource,
  type ResolutionContext,
  type RollOutcome,
} from "random-source-engine";
import { type IdGenerator, systemIdGenerator } from "$lib/utils/runtime-deps";

/**
 * Vault-backed CRUD for random tables and card decks (#2247).
 *
 * Sources live as Markdown files under `_tables/` and `_decks/`, so they are
 * exported, backed up, and carried by a Drive push/pull exactly like the rest
 * of the vault, and stay readable if a user opens one directly.
 */

export const TABLE_DIR = "_tables";
export const DECK_DIR = "_decks";

/** File access seam, so the store is unit-testable without a real vault. */
export interface RandomSourceFiles {
  list(dir: string): Promise<string[]>;
  read(path: string): Promise<string | undefined>;
  write(path: string, contents: string): Promise<void>;
  remove(path: string): Promise<void>;
}

export class RandomSourceStore {
  sources = $state<RandomSource[]>([]);
  loading = $state(false);

  constructor(
    private files: RandomSourceFiles,
    private idGenerator: IdGenerator = systemIdGenerator,
    private engine: RandomSourceEngine = new RandomSourceEngine(),
  ) {}

  get tables(): RandomSource[] {
    return this.sources.filter((s) => s.kind === "table");
  }

  get decks(): RandomSource[] {
    return this.sources.filter((s) => s.kind === "deck");
  }

  /** Every source name, used for uniqueness checks and reference lookup. */
  get names(): string[] {
    return this.sources.map((s) => s.name);
  }

  async load(): Promise<void> {
    this.loading = true;
    try {
      const loaded: RandomSource[] = [];
      for (const dir of [TABLE_DIR, DECK_DIR]) {
        for (const path of await this.files.list(dir)) {
          const text = await this.files.read(path);
          if (!text) continue;
          const parsed = parseRandomSource(text);
          // A file that fails to parse is skipped rather than fatal: one bad
          // hand-edit must not take down the whole list.
          if (parsed.ok) loaded.push(parsed.value);
          else console.warn(`[RandomSources] Skipped ${path}: ${parsed.error}`);
        }
      }
      this.sources = loaded;
    } finally {
      this.loading = false;
    }
  }

  findByName(name: string): RandomSource | undefined {
    const key = name.trim().toLowerCase();
    return this.sources.find((s) => s.name.trim().toLowerCase() === key);
  }

  findById(id: string): RandomSource | undefined {
    return this.sources.find((s) => s.id === id);
  }

  /** Close name matches, for the "did you mean" reply to a failed lookup. */
  suggestNames(name: string, limit = 3): string[] {
    const key = name.trim().toLowerCase();
    if (!key) return [];
    return this.sources
      .map((s) => ({
        name: s.name,
        score: similarity(key, s.name.toLowerCase()),
      }))
      .filter((c) => c.score > 0.4)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((c) => c.name);
  }

  /** Name → source lookup used when resolving `{reference}` tokens. */
  resolutionContext(): ResolutionContext {
    return { lookup: (name) => this.findByName(name) };
  }

  roll(source: RandomSource): RollOutcome {
    return this.engine.roll(source, this.resolutionContext());
  }

  rollMany(sources: RandomSource[]): RollOutcome {
    return this.engine.rollMany(sources, this.resolutionContext());
  }

  rerollFragment(outcome: RollOutcome, nodePath: number[]): RollOutcome {
    return this.engine.rerollFragment(
      outcome,
      nodePath,
      this.resolutionContext(),
    );
  }

  /** Diagnostics for the editor. Excludes the source itself from the name check. */
  validate(source: RandomSource): Diagnostic[] {
    const others = this.sources
      .filter((s) => s.id !== source.id)
      .map((s) => s.name);
    return validateSource(source, others, this.names);
  }

  create(kind: "table" | "deck", name: string): RandomSource {
    const base: RandomSource = {
      id: this.idGenerator.uuid(),
      name,
      kind,
      labels: [],
    };
    return kind === "table"
      ? { ...base, selection: { mode: "weighted" }, entries: [] }
      : {
          ...base,
          cards: [],
          spreads: [],
          deckOptions: {
            drawMode: "without-replacement",
            allowReversals: false,
          },
        };
  }

  /**
   * Persists a source.
   *
   * A duplicate name is the one condition that blocks a save: references bind
   * by name, so allowing two would make resolution non-deterministic (FR-003a).
   * Every other diagnostic is a warning the editor surfaces without blocking.
   */
  async save(source: RandomSource): Promise<Diagnostic[]> {
    const diagnostics = this.validate(source);
    if (diagnostics.some((d) => d.severity === "error")) return diagnostics;

    await this.files.write(pathOf(source), serialiseRandomSource(source));
    const index = this.sources.findIndex((s) => s.id === source.id);
    if (index === -1) this.sources = [...this.sources, source];
    else
      this.sources = this.sources.map((s) => (s.id === source.id ? source : s));

    return diagnostics;
  }

  async rename(source: RandomSource, newName: string): Promise<Diagnostic[]> {
    const renamed = { ...source, name: newName };
    const diagnostics = this.validate(renamed);
    if (diagnostics.some((d) => d.severity === "error")) return diagnostics;

    // The slug is derived from the name, so a rename moves the file.
    await this.files.remove(pathOf(source));
    return this.save(renamed);
  }

  async duplicate(source: RandomSource): Promise<RandomSource> {
    const copy: RandomSource = {
      ...structuredClone(source),
      id: this.idGenerator.uuid(),
      name: this.uniqueName(`${source.name} copy`),
    };
    await this.save(copy);
    return copy;
  }

  async remove(source: RandomSource): Promise<void> {
    await this.files.remove(pathOf(source));
    this.sources = this.sources.filter((s) => s.id !== source.id);
  }

  /**
   * Sources whose text references `name`.
   *
   * Used to warn before a rename or delete breaks someone's table (FR-042).
   */
  referencesTo(name: string): RandomSource[] {
    const key = `{${name.trim().toLowerCase()}}`;
    return this.sources.filter((s) => {
      const texts = [
        ...(s.entries ?? []).map((e) => e.text),
        ...(s.cards ?? []).map((c) => `${c.body} ${c.reversedMeaning ?? ""}`),
      ];
      return texts.some((t) => t.toLowerCase().includes(key));
    });
  }

  private uniqueName(candidate: string): string {
    if (!this.findByName(candidate)) return candidate;
    let n = 2;
    while (this.findByName(`${candidate} ${n}`)) n++;
    return `${candidate} ${n}`;
  }
}

export function slugify(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

export function pathOf(source: RandomSource): string {
  const dir = source.kind === "table" ? TABLE_DIR : DECK_DIR;
  return `${dir}/${slugify(source.name)}.md`;
}

/** Dice-coefficient similarity over character bigrams, for name suggestions. */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = (s: string) => {
    const out = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      out.set(g, (out.get(g) ?? 0) + 1);
    }
    return out;
  };
  const first = bigrams(a);
  const second = bigrams(b);
  let shared = 0;
  for (const [gram, count] of first) {
    shared += Math.min(count, second.get(gram) ?? 0);
  }
  return (2 * shared) / (a.length - 1 + b.length - 1);
}
