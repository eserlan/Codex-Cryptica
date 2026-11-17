import { MAX_TRAITS_PER_PACKAGE } from "schema";
import type {
  Entity,
  StatSheetField,
  Trait,
  TraitPackageKind,
  TraitSelection,
} from "schema";
import { resolveFieldByKeyOrId } from "./field-keys";

export type TraitAdjustmentPreview =
  | {
      status: "applied";
      traitName: string;
      target: string;
      amount: number;
      fieldId: string;
      fieldLabel: string;
      base: number;
      effective: number;
    }
  | {
      status: "missing";
      traitName: string;
      target: string;
      amount: number;
    }
  | {
      status: "incompatible";
      traitName: string;
      target: string;
      amount: number;
      fieldType: StatSheetField["type"];
    };

export interface EffectiveValue {
  base: number;
  effective: number;
  contributions: { sourceTitle: string; traitName: string; amount: number }[];
}

export function isSpeciesDefinition(
  entity: Pick<Entity, "type" | "traitPackage">,
): boolean {
  return entity.type === "creature" && entity.traitPackage?.kind === "species";
}

function baseOf(field: StatSheetField): number {
  return typeof field.value === "number" ? field.value : 0;
}

/** Shows what each adjustment would do on this sheet, without changing it. */
export function previewTraitSelection(
  fields: readonly StatSheetField[],
  traits: readonly Trait[],
): TraitAdjustmentPreview[] {
  return traits.flatMap((trait) =>
    trait.adjustments.map((adj): TraitAdjustmentPreview => {
      const head = {
        traitName: trait.name,
        target: adj.target,
        amount: adj.amount,
      };
      const field = resolveFieldByKeyOrId(fields, adj.target);
      if (!field) return { ...head, status: "missing" };
      if (field.type !== "number") {
        return { ...head, status: "incompatible", fieldType: field.type };
      }
      const base = baseOf(field);
      return {
        ...head,
        status: "applied",
        fieldId: field.id,
        fieldLabel: field.label,
        base,
        effective: base + adj.amount,
      };
    }),
  );
}

/** Effective values per number field id; base values are never modified. */
export function computeEffectiveValues(
  fields: readonly StatSheetField[],
  selections: readonly TraitSelection[],
): Map<string, EffectiveValue> {
  const result = new Map<string, EffectiveValue>();
  const seenKinds = new Set<TraitPackageKind>();
  for (const selection of selections) {
    if (seenKinds.has(selection.kind)) continue;
    seenKinds.add(selection.kind);
    if (selection.traits.length > MAX_TRAITS_PER_PACKAGE) continue;
    applySelectionAdjustments(result, fields, selection);
  }
  return result;
}

function applySelectionAdjustments(
  result: Map<string, EffectiveValue>,
  fields: readonly StatSheetField[],
  selection: TraitSelection,
): void {
  for (const trait of selection.traits) {
    for (const adj of trait.adjustments) {
      const field = resolveFieldByKeyOrId(fields, adj.target);
      if (!field || field.type !== "number") continue;
      const base = baseOf(field);
      const entry = result.get(field.id) ?? {
        base,
        effective: base,
        contributions: [],
      };
      entry.effective += adj.amount;
      entry.contributions.push({
        sourceTitle: selection.sourceTitle,
        traitName: trait.name,
        amount: adj.amount,
      });
      result.set(field.id, entry);
    }
  }
}

export function setTraitSelection(
  selections: readonly TraitSelection[],
  selection: TraitSelection,
): TraitSelection[] {
  return [...selections.filter((s) => s.kind !== selection.kind), selection];
}

export function removeTraitSelection(
  selections: readonly TraitSelection[],
  kind: TraitPackageKind,
): TraitSelection[] {
  return selections.filter((s) => s.kind !== kind);
}
