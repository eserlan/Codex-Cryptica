import {
  parseRandomSource,
  serialiseRandomSource,
  validateSource,
  suggestNames,
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

/** What a rename or delete would break, for the confirmation prompt. */
export interface ImpactReport {
  referencedBy: RandomSource[];
  safe: boolean;
}

export class RandomSourceStore {
  sources = $state<RandomSource[]>([]);
  loading = $state(false);

  /**
   * Every read-modify-write of the collection runs one at a time.
   *
   * Reading the vault while a save is still in flight would replace the list
   * with what is on disk and lose the newer copy — and the vault opens *after*
   * a view mounts, so that ordering is the normal case, not a rare one.
   */
  private queue: Promise<unknown> = Promise.resolve();

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

  load(): Promise<void> {
    return this.serialise(() => this.loadNow());
  }

  private async loadNow(): Promise<void> {
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
    return suggestNames(name, this.names, limit);
  }

  /** Name → source lookup used when resolving `{reference}` tokens. */
  resolutionContext(): ResolutionContext {
    return { lookup: (name) => this.findByName(name) };
  }

  roll(source: RandomSource): RollOutcome {
    return this.engine.roll($state.snapshot(source), this.resolutionContext());
  }

  rollMany(sources: RandomSource[]): RollOutcome {
    return this.engine.rollMany(
      $state.snapshot(sources),
      this.resolutionContext(),
    );
  }

  rerollFragment(outcome: RollOutcome, nodePath: number[]): RollOutcome {
    return this.engine.rerollFragment(
      $state.snapshot(outcome),
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
  save(source: RandomSource): Promise<Diagnostic[]> {
    return this.serialise(() => this.saveNow(source));
  }

  private async saveNow(source: RandomSource): Promise<Diagnostic[]> {
    const diagnostics = this.validate(source);
    if (diagnostics.some((d) => d.severity === "error")) return diagnostics;

    await this.files.write(this.pathFor(source), serialiseRandomSource(source));
    const index = this.sources.findIndex((s) => s.id === source.id);
    if (index === -1) this.sources = [...this.sources, source];
    else
      this.sources = this.sources.map((s) => (s.id === source.id ? source : s));

    return diagnostics;
  }

  rename(source: RandomSource, newName: string): Promise<Diagnostic[]> {
    return this.serialise(() => this.renameNow(source, newName));
  }

  private async renameNow(
    source: RandomSource,
    newName: string,
  ): Promise<Diagnostic[]> {
    const renamed = { ...source, name: newName };
    const diagnostics = this.validate(renamed);
    if (diagnostics.some((d) => d.severity === "error")) return diagnostics;

    // The slug is derived from the name, so a rename moves the file. Write the
    // new copy before removing the old one: removing first means a failed write
    // — a revoked handle, a full disk — leaves nothing on disk at all, and the
    // source is gone rather than merely misnamed.
    const oldPath = this.pathFor(source);
    const result = await this.saveNow(renamed);
    const newPath = this.pathFor(renamed);
    if (oldPath !== newPath) await this.files.remove(oldPath);
    return result;
  }

  /**
   * The file a source is stored at, disambiguated on collision.
   *
   * Uniqueness is enforced on the name, but the filename is a slug of it, and
   * the slug is lossier: "Forest Encounters", "Forest-Encounters", and
   * "forest encounters!" are three legal names that collapse to one path. Left
   * alone, saving the second silently overwrites the first, which then vanishes
   * on the next load. The id suffix is only added when a collision actually
   * exists, so ordinary files keep their readable names.
   */
  private pathFor(source: RandomSource): string {
    const path = pathOf(source);
    const collides = this.sources.some(
      (s) => s.id !== source.id && pathOf(s) === path,
    );
    return collides
      ? path.replace(/\.md$/, `-${source.id.slice(0, 8)}.md`)
      : path;
  }

  duplicate(source: RandomSource): Promise<RandomSource> {
    return this.serialise(() => this.duplicateNow(source));
  }

  private async duplicateNow(source: RandomSource): Promise<RandomSource> {
    const copy: RandomSource = {
      ...structuredClone(source),
      id: this.idGenerator.uuid(),
      name: this.uniqueName(`${source.name} copy`),
    };
    await this.saveNow(copy);
    return copy;
  }

  remove(source: RandomSource): Promise<void> {
    return this.serialise(async () => {
      // Resolved before the source leaves the list, since the collision check
      // that picks the path reads the list.
      const path = this.pathFor(source);
      await this.files.remove(path);
      this.sources = this.sources.filter((s) => s.id !== source.id);
    });
  }

  /** Runs `op` after every operation already queued. */
  private serialise<T>(op: () => Promise<T>): Promise<T> {
    const run = this.queue.then(op, op);
    // The queue itself must survive a failed operation, or one bad write would
    // wedge every later one.
    this.queue = run.catch(() => undefined);
    return run;
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

  /**
   * What renaming or deleting `source` would break (FR-042).
   *
   * References bind by name, so a rename is not a silent rebind: the sources
   * pointing at the old name have to be named before the user commits, or the
   * breakage only shows up on the next roll.
   */
  impactOf(source: RandomSource): ImpactReport {
    const referencedBy = this.referencesTo(source.name).filter(
      (s) => s.id !== source.id,
    );
    return { referencedBy, safe: referencedBy.length === 0 };
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
