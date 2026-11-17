import {
  SpeciesDefinitionSchema,
  type AppliedSpecies,
  type Entity,
  type StatSheetField,
} from "schema";

type Adjustment = AppliedSpecies["traits"][number]["adjustments"][number];
export interface SpeciesContribution {
  traitId: string;
  traitName: string;
  key: string;
  amount: number;
  fieldId?: string;
  base?: number;
  effective?: number;
  reason?: string;
}

function numericProblem(field: StatSheetField): string | undefined {
  if (field.type !== "number") return "Target must be a number field";
  if (typeof field.value !== "number" || !Number.isFinite(field.value)) {
    return "Base must be a finite number";
  }
}

/** Uses only saved bindings; missing or skipped targets never resolve by key again. */
export function calculateSpecies(
  snapshot: AppliedSpecies | undefined,
  fields: readonly StatSheetField[],
): SpeciesContribution[] {
  if (!snapshot) return [];
  const rows = snapshot.traits.flatMap((trait) =>
    trait.adjustments.map((adjustment): SpeciesContribution => {
      const row = {
        traitId: trait.id,
        traitName: trait.name,
        key: adjustment.key,
        amount: adjustment.amount,
      };
      if (adjustment.resolution.status === "skipped")
        return { ...row, reason: adjustment.resolution.reason };
      const fieldId = adjustment.resolution.fieldId;
      const matches = fields.filter((field) => field.id === fieldId);
      if (matches.length !== 1)
        return {
          ...row,
          fieldId,
          reason: "Bound field is unavailable or ambiguous",
        };
      const field = matches[0];
      const reason = numericProblem(field);
      return {
        ...row,
        fieldId,
        ...(reason ? { reason } : { base: field.value as number }),
      };
    }),
  );
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (!row.reason && row.fieldId)
      totals.set(row.fieldId, (totals.get(row.fieldId) ?? 0) + row.amount);
  }
  return rows.map((row) => {
    if (row.reason || !row.fieldId || row.base === undefined) return row;
    const effective = row.base + totals.get(row.fieldId)!;
    return Number.isFinite(effective)
      ? { ...row, effective }
      : { ...row, reason: "Effective value must be finite" };
  });
}

/** Captures a candidate independently of the previous selection, without mutating bases. */
export function previewSpecies(entity: Entity, source: Entity): AppliedSpecies {
  if (source.type !== "creature" || !source.speciesDefinition)
    throw new Error("Choose a designated Species/Ancestry Creature");
  if (entity.appliedSpecies?.source.localEntityId === source.id)
    return structuredClone(entity.appliedSpecies);
  const definition = SpeciesDefinitionSchema.parse(source.speciesDefinition);
  const fields = entity.statSheet?.fields ?? [];
  const snapshot: AppliedSpecies = {
    kind: "species",
    version: 1,
    source: {
      entityId: source.id,
      title: source.title,
      localEntityId: source.id,
    },
    traits: definition.traits.map((trait) => ({
      ...trait,
      adjustments: trait.adjustments.map((adjustment): Adjustment => {
        const matches = fields.filter((field) => field.key === adjustment.key);
        const field = matches[0];
        const reason =
          matches.length === 0
            ? "Missing key"
            : matches.length !== 1
              ? "Ambiguous key"
              : fields.filter((f) => f.id === field.id).length !== 1
                ? "Ambiguous field ID"
                : numericProblem(field);
        return {
          ...adjustment,
          resolution: reason
            ? { status: "skipped", reason }
            : { status: "bound", fieldId: field.id },
        };
      }),
    })),
  };
  const results = calculateSpecies(snapshot, fields);
  let index = 0;
  for (const trait of snapshot.traits) {
    for (const adjustment of trait.adjustments) {
      const result = results[index++];
      if (result.reason)
        adjustment.resolution = { status: "skipped", reason: result.reason };
    }
  }
  return snapshot;
}

export function signedSpeciesAmount(amount: number): string {
  return amount >= 0 ? `+${amount}` : String(amount);
}
