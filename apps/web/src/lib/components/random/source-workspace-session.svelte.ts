import type { Diagnostic, RandomSource } from "random-source-engine";
import type { CandidateTableEntry } from "generator-engine";
import { randomSources } from "#lib/features/random/index.js";
import {
  systemIdGenerator,
  type IdGenerator,
} from "#lib/utils/runtime-deps.js";

type SourceRepository = Pick<
  typeof randomSources,
  | "findById"
  | "findByName"
  | "create"
  | "save"
  | "rename"
  | "remove"
  | "validate"
  | "impactOf"
>;

/** One authored draft and its ordered persistence lifecycle, independent of the workspace view. */
export class SourceWorkspaceSession {
  constructor(
    readonly sources: SourceRepository = randomSources,
    private readonly getIdGenerator: () => IdGenerator = () =>
      systemIdGenerator,
  ) {}
  selectedId = $state<string | undefined>();
  draft = $state<RandomSource | undefined>();
  diagnostics = $state<Diagnostic[]>([]);
  private saveTimer: ReturnType<typeof setTimeout> | undefined;
  private writes: Promise<unknown> = Promise.resolve();
  /** An edit is typed but not yet handed to the queue. */
  private dirty = $state(false);
  private inFlight = $state(0);

  // "Saving" covers the debounce too: between the keystroke and the write there
  // is real unsaved work, and saying otherwise would be a lie the user could
  // act on by closing the tab.
  saving = $derived(this.dirty || this.inFlight > 0);
  deleteImpact = $state<RandomSource[] | undefined>();
  pendingRename = $state<
    { name: string; referencedBy: RandomSource[] } | undefined
  >();

  select = (source: RandomSource) => {
    this.flushPendingSave();
    this.selectedId = source.id;
    this.draft = $state.snapshot(source) as RandomSource;
    this.diagnostics = this.sources.validate(this.draft);
    this.deleteImpact = undefined;
    this.pendingRename = undefined;
  };

  saveNew = (source: RandomSource) => {
    this.enqueue(() => this.sources.save(source));
  };

  create = (kind: "table" | "deck") =>
    this.sources.create(kind, this.uniqueName(`New ${kind}`));

  copy = (source: RandomSource): RandomSource => {
    const copyName = this.uniqueName(`${source.name} (Copy)`);
    const ids = this.getIdGenerator();
    return {
      ...($state.snapshot(source) as RandomSource),
      id: ids.uuid(),
      name: copyName,
      entries: source.entries?.map((entry) => ({ ...entry, id: ids.uuid() })),
      cards: source.cards?.map((card) => ({ ...card, id: ids.uuid() })),
      spreads: source.spreads?.map((spread) => ({ ...spread, id: ids.uuid() })),
    };
  };

  createGenerated = (
    kind: "table" | "deck",
    candidates: CandidateTableEntry[],
    title?: string,
    description?: string,
  ) => {
    const created = this.sources.create(
      "table",
      this.uniqueName(title?.trim() || `New ${kind}`),
    );
    created.description = description;
    created.entries = candidates.map((candidate) => ({
      id: candidate.id || this.getIdGenerator().uuid(),
      text: candidate.text,
      weight: candidate.weight ?? 1,
    }));
    return created;
  };

  renameSource = (source: RandomSource, name: string) => {
    this.enqueue(async () => {
      const stored = this.sources.findById(source.id);
      if (stored) await this.sources.rename(stored, name);
    });
  };
  private uniqueName = (base: string): string => {
    if (!this.sources.findByName(base)) return base;
    let n = 2;
    while (this.sources.findByName(`${base} ${n}`)) n++;
    return `${base} ${n}`;
  };

  /**
   * Saves on a short delay so typing does not write a file per keystroke.
   * Diagnostics update immediately, because an editor that reports a problem
   * only after a pause reports it too late to help.
   */
  onChange = (next: RandomSource) => {
    const normalized: RandomSource =
      this.draft && this.draft.id === next.id
        ? { ...next, name: this.draft.name }
        : next;
    this.draft = normalized;
    this.diagnostics = this.sources.validate(normalized);
    this.dirty = true;
    clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout(() => {
      this.dirty = false;
      this.persist(normalized);
    }, 400);
  };

  flushPendingSave = () => {
    clearTimeout(this.saveTimer);
    if (!this.dirty) return;
    this.dirty = false;
    if (this.draft) this.persist(this.draft);
  };

  /**
   * One write at a time, in the order they were asked for.
   *
   * Creating a source and editing it are two writes to the same collection, and
   * a create still in flight while an edit lands would leave the file and the
   * in-memory list disagreeing.
   */
  private enqueue = (op: () => Promise<unknown>) => {
    this.inFlight++;
    this.writes = this.writes
      .then(op, op)
      .catch((err) => console.error("[RandomSources] Write failed", err))
      .finally(() => this.inFlight--);
  };

  private persist = (next: RandomSource) => {
    this.enqueue(async () => {
      const stored = this.sources.findById(next.id);
      // A rename moves the file, so it cannot go through the plain save path.
      this.diagnostics =
        stored && stored.name !== next.name
          ? await this.sources.rename({ ...next, name: stored.name }, next.name)
          : await this.sources.save(next);
    });
  };

  /**
   * A rename is not a rebind: sources point at the old name and keep pointing
   * at it. So the sources that would break are named before it happens (FR-042).
   */
  requestRename = (name: string): boolean => {
    // Judged from the draft, not the stored copy: a source created a moment ago
    // may still be in the write queue, and renaming it must not have to wait.
    if (!this.draft || this.draft.name === name) return false;

    const impact = this.sources.impactOf(this.draft);
    if (impact.safe) {
      this.commitRename(name);
      return true;
    }
    this.pendingRename = { name, referencedBy: impact.referencedBy };
    return false;
  };

  commitRename = (name: string) => {
    if (!this.draft) return;
    // Pending edits land under the old name first, so the rename moves a file
    // whose contents are already current.
    this.flushPendingSave();
    const id = this.draft.id;
    this.draft = { ...this.draft, name };
    this.pendingRename = undefined;

    this.enqueue(async () => {
      const stored = this.sources.findById(id);
      if (!stored) return;
      const result = await this.sources.rename(stored, name);
      this.diagnostics = result;
      // A rejected rename must not leave the editor showing a name the vault
      // does not have.
      if (result.some((d) => d.severity === "error") && this.draft?.id === id) {
        this.draft = { ...this.draft, name: stored.name };
      }
    });
  };

  confirmDelete = (source: RandomSource) => {
    const removesSelectedSource = source.id === this.selectedId;
    if (removesSelectedSource) this.flushPendingSave();
    this.enqueue(() => this.sources.remove(source));
    this.deleteImpact = undefined;
    if (removesSelectedSource) {
      this.selectedId = undefined;
      this.draft = undefined;
    }
    return removesSelectedSource;
  };
}
