import {
  DEFAULT_ITEM_TABLE_COLUMNS,
  type Entity,
  type StatSheetField,
  type StatSheetFieldType,
} from "schema";
import {
  slugifyFieldKey,
  uniqueFieldKey,
  validateFieldKeyFormat,
} from "@codex/stat-sheet-engine";
import type { IdGenerator } from "#lib/utils/runtime-deps.js";
import type { vault as vaultStore } from "#lib/stores/vault.svelte.js";
import type { notificationStore } from "#lib/stores/ui/notification.svelte.js";

/** Per-editor scratchpad and persistence policy. Dependencies stay at the composition boundary. */
export class StatSheetEditorState {
  fields = $state<StatSheetField[]>([]);

  constructor(
    private entity: () => Entity,
    private idGenerator: IdGenerator,
    private vault: Pick<typeof vaultStore, "updateEntity">,
    private notifications: Pick<typeof notificationStore, "confirm">,
  ) {
    this.fields = $state.snapshot(entity().statSheet?.fields ?? []);
  }

  persist = (nextFields: StatSheetField[]) => {
    this.fields = nextFields;
    this.vault.updateEntity(this.entity().id, {
      statSheet: {
        templateId: this.entity().statSheet?.templateId ?? null,
        fields: nextFields,
        presentationTemplateId:
          this.entity().statSheet?.presentationTemplateId ?? null,
      },
    });
  };

  addField = () => {
    const id = `field-${this.idGenerator.uuid()}`;
    // #3180: new fields get a readable key up front (unique within the
    // sheet); the immutable id stays the stored identifier.
    const key = uniqueFieldKey(
      slugifyFieldKey("New Field"),
      this.fields.flatMap((f) => (f.key ? [f.key, f.id] : [f.id])),
    );
    this.persist([
      ...this.fields,
      { id, key, label: "New Field", type: "text" as StatSheetFieldType },
    ]);
  };

  // Per-field key validation errors, keyed by field id. Invalid keys are
  // never persisted — the last valid key (or no key) stays stored.
  keyErrors = $state<Record<string, string>>({});

  handleKeyInput = (field: StatSheetField, raw: string) => {
    const key = raw.trim();
    if (key === "") {
      const next = { ...this.keyErrors };
      delete next[field.id];
      this.keyErrors = next;
      this.updateField(field.id, { key: undefined });
      return;
    }
    const formatError = validateFieldKeyFormat(key);
    if (formatError) {
      this.keyErrors = { ...this.keyErrors, [field.id]: formatError };
      return;
    }
    const clash = this.fields.some(
      (f) => f.id !== field.id && (f.key === key || f.id === key),
    );
    if (clash) {
      this.keyErrors = {
        ...this.keyErrors,
        [field.id]: `Key "${key}" is already used by another field.`,
      };
      return;
    }
    const next = { ...this.keyErrors };
    delete next[field.id];
    this.keyErrors = next;
    this.updateField(field.id, { key });
  };

  updateField = (id: string, updates: Partial<StatSheetField>) => {
    this.persist(
      this.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  };

  // Once a new minimum or maximum is committed, a current value outside it
  // moves inside, so the sheet never shows "100 / 12". Not per keystroke:
  // typing "12" passes through "1".
  // Also normalises contradictory bounds where min > max.
  // fallow-ignore-next-line complexity
  clampCounterToBounds = (id: string) => {
    const field = this.fields.find((f) => f.id === id);
    if (!field) return;
    const updates: Partial<StatSheetField> = {};
    const min = field.min;
    let max = field.max;

    if (min !== undefined && max !== undefined && min > max) {
      // Contradictory bounds: raise max to match min
      max = min;
      updates.max = max;
    }

    if (typeof field.value === "number") {
      let value = field.value;
      if (min !== undefined) value = Math.max(min, value);
      if (max !== undefined) value = Math.min(max, value);
      if (value !== field.value) updates.value = value;
    }

    if (Object.keys(updates).length > 0) {
      this.updateField(id, updates);
    }
  };

  // fallow-ignore-next-line complexity
  changeFieldType = (field: StatSheetField, newType: StatSheetFieldType) => {
    const updates: Partial<StatSheetField> = { type: newType };
    if (newType === "item-table" && !field.columns) {
      updates.columns = DEFAULT_ITEM_TABLE_COLUMNS.map((c) => ({ ...c }));
    } else if (newType === "dice-pool") {
      const rawVal =
        typeof field.value === "number" && !isNaN(field.value)
          ? Math.max(0, Math.min(1000, Math.floor(field.value)))
          : 3;
      updates.value = rawVal;
      updates.startValue = rawVal;
      if (!field.formula) updates.formula = "d6";
      if (field.min === undefined) updates.min = 0;
      else updates.min = Math.max(0, Math.floor(field.min));
      if (field.max !== undefined)
        updates.max = Math.min(1000, Math.floor(field.max));
      if (field.step === undefined) updates.step = 1;
      else updates.step = Math.max(1, Math.floor(Math.abs(field.step)));
      if (field.allowDieChange === undefined) updates.allowDieChange = true;
    }
    this.updateField(field.id, updates);
  };

  private hasNonDefaultValue(field: StatSheetField): boolean {
    if (field.type === "heading") return false;
    if (field.value === undefined) return false;
    if (field.value === "" || field.value === 0) return false;
    return true;
  }

  removeField = async (field: StatSheetField) => {
    if (this.hasNonDefaultValue(field)) {
      const confirmed = await this.notifications.confirm({
        title: "Delete Field",
        message: `"${field.label}" contains a value. Delete it anyway?`,
        confirmLabel: "Delete",
        isDangerous: true,
      });
      if (!confirmed) return;
    }
    this.persist(this.fields.filter((f) => f.id !== field.id));
  };

  clearAllFields = async () => {
    const confirmed = await this.notifications.confirm({
      title: "Clear Stat Sheet",
      message: `Remove all ${this.fields.length} stat fields and template assignment from "${this.entity().title}"?`,
      confirmLabel: "Clear All",
      isDangerous: true,
    });
    if (!confirmed) return;

    this.persist([]);
    this.vault.updateEntity(this.entity().id, {
      statSheet: { templateId: null, fields: [] },
    });
  };
}
