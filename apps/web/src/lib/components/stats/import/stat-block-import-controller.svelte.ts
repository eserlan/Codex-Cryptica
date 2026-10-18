import {
  applyReviewEdit,
  applyStatSheetMerge,
  canSaveReadResult,
  planStatSheetMerge,
  readStatBlockWithAi,
  readStatBlockWithRules,
  StatBlockReadError,
  StatBlockSourceEmptyError,
  StatBlockSourceTooLongError,
  switchReadResultKind,
  TOV_MONSTER_TEMPLATE_ID,
  TOV_NPC_TEMPLATE_ID,
  type ImportMode,
  type MergePlan,
  type ReadResult,
  type SheetKind,
  type StatBlockReaderGateway,
} from "@codex/stat-sheet-engine";
import type { Entity, StatSheet, StatSheetField } from "schema";
import { applyDerivedModifiers } from "$lib/utils/stat-sheet-field-actions";

export type ImportStep =
  | "paste"
  | "reading"
  | "review"
  | "confirm"
  | "name-clash"
  | "saved"
  | "cancelled";

/** The label FR-020 asks for. Labels, not tags (Constitution XII). */
export const CONVERTED_LABEL = "Converted from 5e";

export interface StatBlockImportDeps {
  gateway: StatBlockReaderGateway;
  aiDisabled: () => boolean;
  /** The entity the sheet belongs to, or null for a new entity. */
  targetEntity: () => Entity | null;
  findEntityByTitle: (title: string) => Entity | null;
  updateEntity: (id: string, updates: Partial<Entity>) => unknown;
  createEntity: (
    type: string,
    title: string,
    data: Partial<Entity>,
  ) => string | null | undefined | Promise<string | null | undefined>;
  entityTypeFor: (kind: SheetKind) => string;
}

const OUTCOME_MESSAGES: Record<string, string> = {
  "no-stat-block": "No stat block was found in that text.",
  several:
    "This paste has more than one creature. Paste one stat block at a time.",
  character: "Character sheets aren't supported yet.",
};

const BLOCK_MESSAGES: Record<string, string> = {
  "template-mismatch":
    "This entity's stat sheet uses a different template. Switch its template first.",
  "missing-required":
    "Armour Class, Hit Points and Challenge Rating are needed before saving.",
};

function errorMessage(error: unknown): string {
  if (error instanceof StatBlockSourceTooLongError) {
    return `Paste just the stat block. This paste is ${error.length} characters; the limit is ${error.limit}.`;
  }
  if (error instanceof StatBlockSourceEmptyError) return error.message;
  if (error instanceof StatBlockReadError) return error.message;
  return "Something went wrong reading this stat block.";
}

/** A fence longer than any backtick run in the text, so the text cannot close it. */
function fenced(text: string): string[] {
  const longest = Math.max(
    0,
    ...(text.match(/`+/g) ?? []).map((run) => run.length),
  );
  const fence = "`".repeat(Math.max(3, longest + 1));
  return [fence, text, fence];
}

/**
 * Appends the pasted text and any leftovers as fenced text, so neither the
 * pasted source nor the model's reply is rendered as Markdown in the notes.
 */
function appendOriginal(
  content: string,
  source: string,
  result: ReadResult,
): string {
  const block = ["## Original stat block", "", ...fenced(source.trim())];
  if (result.leftovers.length > 0) {
    const leftovers = result.leftovers
      .map((item) => `${item.label}: ${item.text}`)
      .join("\n");
    block.push(
      "",
      "## Other text from the stat block",
      "",
      ...fenced(leftovers),
    );
  }
  const head = content.trimEnd();
  return head === "" ? block.join("\n") : `${head}\n\n${block.join("\n")}`;
}

/**
 * Session state for one stat block import. Holds the paste, the read result,
 * the GM's edits and the save decision. Nothing reaches the vault until save().
 */
export class StatBlockImportController {
  step = $state<ImportStep>("paste");
  source = $state("");
  mode = $state<ImportMode>("copy");
  reader = $state<"ai" | "rules">("ai");
  result = $state<ReadResult | null>(null);
  error = $state<string | null>(null);
  canRetry = $state(false);
  keepText = $state(false);
  pendingPlan = $state<MergePlan | null>(null);
  targetOverride = $state<Entity | null>(null);
  clashResolved = $state(false);

  committing = $state(false);

  #deps: StatBlockImportDeps;

  constructor(deps: StatBlockImportDeps) {
    this.#deps = deps;
  }

  get aiAvailable(): boolean {
    return !this.#deps.aiDisabled();
  }

  get target(): Entity | null {
    return this.targetOverride ?? this.#deps.targetEntity();
  }

  get existingSheet(): StatSheet | null {
    return this.target?.statSheet ?? null;
  }

  get canSave(): boolean {
    return (
      this.result !== null &&
      this.result.outcome === "ok" &&
      canSaveReadResult(this.result, this.existingSheet)
    );
  }

  /** Required values that are neither read nor already on the sheet (FR-015a). */
  get missingRequired(): string[] {
    if (!this.result) return [];
    const values = this.result.values as Record<string, unknown>;
    const onSheet = (id: string) =>
      this.existingSheet?.fields.find((f) => f.id === id)?.value != null;
    const required: Array<[string, string]> = [
      ["ac", "Armour Class"],
      ["hp", "Hit Points"],
      ["cr", "Challenge Rating"],
    ];
    return required
      .filter(([key]) => values[key] == null && !onSheet(key))
      .map(([, label]) => label);
  }

  setMode(mode: ImportMode): void {
    if (mode === "convert-5e" && !this.aiAvailable) return;
    this.mode = mode;
  }

  setSource(text: string): void {
    this.source = text;
  }

  /** Reads the pasted text. The AI reader is used unless AI is off or the GM chose the quick reader. */
  async read(): Promise<void> {
    this.error = null;
    this.canRetry = false;
    if (this.source.trim() === "") {
      this.error = errorMessage(new StatBlockSourceEmptyError());
      return;
    }
    const useAi = this.reader === "ai" && this.aiAvailable;
    if (!useAi) this.mode = "copy";
    this.step = "reading";
    try {
      this.result = await this.runRead(useAi);
    } catch (error) {
      this.fail(error, useAi);
      return;
    }
    if (this.result.outcome !== "ok") {
      this.error = OUTCOME_MESSAGES[this.result.outcome] ?? null;
      this.result = null;
      this.step = "paste";
      return;
    }
    this.step = "review";
  }

  private runRead(useAi: boolean): Promise<ReadResult> | ReadResult {
    const request = {
      source: this.source,
      mode: this.mode,
      kindHint: this.kindHint(),
      reader: useAi ? ("ai" as const) : ("rules" as const),
    };
    return useAi
      ? readStatBlockWithAi(request, this.#deps.gateway)
      : readStatBlockWithRules(request);
  }

  private fail(error: unknown, useAi: boolean): void {
    this.step = "paste";
    this.error = errorMessage(error);
    this.canRetry = error instanceof StatBlockReadError && useAi;
  }

  retry(): Promise<void> {
    return this.read();
  }

  /** Falls back to the rule-based reader after an AI failure. The source is kept. */
  useQuickReader(): Promise<void> {
    this.reader = "rules";
    return this.read();
  }

  setKind(kind: SheetKind): void {
    if (this.result) this.result = switchReadResultKind(this.result, kind);
  }

  edit(path: string, value: unknown): void {
    if (this.result) this.result = applyReviewEdit(this.result, path, value);
  }

  setKeepText(keep: boolean): void {
    this.keepText = keep;
  }

  /** Save, or ask first when existing values would be overwritten (FR-017). */
  async save(): Promise<void> {
    if (this.committing || !this.result || !this.canSave) return;
    const plan = planStatSheetMerge(this.result, this.existingSheet);
    if (plan.blocked) {
      this.error = BLOCK_MESSAGES[plan.blocked] ?? null;
      return;
    }
    this.pendingPlan = plan;
    if (plan.overwrites.length > 0 && this.step !== "confirm") {
      this.step = "confirm";
      return;
    }
    await this.commit();
  }

  /** Back from the overwrite confirmation to the review screen. */
  backToReview(): void {
    this.step = "review";
  }

  /** Name clash for a new entity: import into the existing entity instead. */
  importIntoExisting(): Promise<void> {
    const existing = this.#deps.findEntityByTitle(this.newTitle());
    if (!existing) return this.save();
    this.targetOverride = existing;
    this.clashResolved = true;
    return this.save();
  }

  /** Name clash: create a separate entity with the same name. */
  createSeparate(): Promise<void> {
    this.clashResolved = true;
    return this.commit();
  }

  /** The entity a name clash points at, for "Open existing". */
  clashEntity(): Entity | null {
    return this.#deps.findEntityByTitle(this.newTitle());
  }

  cancel(): void {
    this.step = "cancelled";
  }

  /** Writes the plan. Only ever called from save(), confirm or a clash choice. */
  async commit(): Promise<void> {
    const plan = this.pendingPlan;
    const result = this.result;
    if (this.committing || !plan || !result || plan.blocked) return;
    this.committing = true;
    try {
      await this.write(plan, result);
    } finally {
      this.committing = false;
    }
  }

  private async write(plan: MergePlan, result: ReadResult): Promise<void> {
    const target = this.target;
    const statSheet = this.sheetFor(plan, target);
    const labels = this.labelsFor(target);
    const content = this.keepText
      ? appendOriginal(target?.content ?? "", this.source, result)
      : undefined;

    if (target) {
      await this.#deps.updateEntity(target.id, {
        statSheet,
        labels,
        ...(content !== undefined ? { content } : {}),
      });
      this.step = "saved";
      return;
    }

    const title = this.newTitle();
    if (!this.clashResolved && this.#deps.findEntityByTitle(title)) {
      this.step = "name-clash";
      return;
    }
    await this.#deps.createEntity(
      this.#deps.entityTypeFor(result.kind),
      title,
      {
        statSheet,
        labels,
        content: content ?? "",
      },
    );
    this.step = "saved";
  }

  private sheetFor(plan: MergePlan, target: Entity | null): StatSheet {
    const applied = applyStatSheetMerge(plan, target?.statSheet ?? null);
    return {
      ...applied,
      fields: applyDerivedModifiers(applied.fields as StatSheetField[]),
    } as StatSheet;
  }

  private labelsFor(target: Entity | null): string[] {
    const labels = [...(target?.labels ?? [])];
    if (this.mode === "convert-5e" && !labels.includes(CONVERTED_LABEL))
      labels.push(CONVERTED_LABEL);
    return labels;
  }

  private newTitle(): string {
    return this.result?.name?.trim() || "Imported stat block";
  }

  private kindHint(): SheetKind | undefined {
    const templateId = this.existingSheet?.templateId;
    if (templateId === TOV_MONSTER_TEMPLATE_ID) return "creature";
    if (templateId === TOV_NPC_TEMPLATE_ID) return "npc";
    return undefined;
  }
}
