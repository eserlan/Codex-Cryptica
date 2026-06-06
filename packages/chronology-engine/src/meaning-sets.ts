export type TemporalMeaningRole = "primary" | "begin" | "end" | "custom";
export type TemporalMeaningKind = "point" | "span";
export type TemporalMeaningTarget =
  | "date"
  | "start_date"
  | "end_date"
  | "anchor";

export interface TemporalMeaning {
  id: string;
  label: string;
  kind: TemporalMeaningKind;
  target: TemporalMeaningTarget;
  anchorType?: string;
  role?: TemporalMeaningRole;
  endMeaningId?: string;
}

const customMeaning: TemporalMeaning = {
  id: "custom",
  label: "Custom anchor",
  kind: "point",
  target: "anchor",
  anchorType: "custom",
  role: "custom",
};

export const MEANING_SETS: Record<string, TemporalMeaning[]> = {
  event: [
    {
      id: "date",
      label: "Date",
      kind: "point",
      target: "date",
      role: "primary",
      endMeaningId: "end_date",
    },
    {
      id: "start_date",
      label: "Start date",
      kind: "span",
      target: "start_date",
      role: "begin",
      endMeaningId: "end_date",
    },
    {
      id: "end_date",
      label: "End date",
      kind: "point",
      target: "end_date",
      role: "end",
    },
    customMeaning,
  ],
  character: [
    {
      id: "born",
      label: "Born",
      kind: "point",
      target: "date",
      role: "primary",
      endMeaningId: "died",
    },
    {
      id: "died",
      label: "Died",
      kind: "point",
      target: "anchor",
      anchorType: "died",
      role: "end",
    },
    {
      id: "activePeriod",
      label: "Active period",
      kind: "span",
      target: "anchor",
      anchorType: "activePeriod",
    },
    {
      id: "reign",
      label: "Reign",
      kind: "span",
      target: "anchor",
      anchorType: "reign",
    },
    {
      id: "majorAppearance",
      label: "Major appearance",
      kind: "point",
      target: "anchor",
      anchorType: "majorAppearance",
    },
    customMeaning,
  ],
  faction: [
    {
      id: "founded",
      label: "Founded",
      kind: "point",
      target: "date",
      role: "primary",
      endMeaningId: "dissolved",
    },
    {
      id: "dissolved",
      label: "Dissolved",
      kind: "point",
      target: "anchor",
      anchorType: "dissolved",
      role: "end",
    },
    {
      id: "activePeriod",
      label: "Active period",
      kind: "span",
      target: "anchor",
      anchorType: "activePeriod",
    },
    {
      id: "schism",
      label: "Schism",
      kind: "point",
      target: "anchor",
      anchorType: "schism",
    },
    {
      id: "merger",
      label: "Merger",
      kind: "point",
      target: "anchor",
      anchorType: "merger",
    },
    customMeaning,
  ],
  location: [
    {
      id: "founded",
      label: "Founded",
      kind: "point",
      target: "date",
      role: "primary",
      endMeaningId: "destroyed",
    },
    {
      id: "destroyed",
      label: "Destroyed",
      kind: "point",
      target: "anchor",
      anchorType: "destroyed",
      role: "end",
    },
    {
      id: "occupied",
      label: "Occupied",
      kind: "span",
      target: "anchor",
      anchorType: "occupied",
    },
    {
      id: "goldenAge",
      label: "Golden age",
      kind: "span",
      target: "anchor",
      anchorType: "goldenAge",
    },
    {
      id: "relevantPeriod",
      label: "Relevant period",
      kind: "span",
      target: "anchor",
      anchorType: "relevantPeriod",
    },
    customMeaning,
  ],
  item: [
    {
      id: "created",
      label: "Created",
      kind: "point",
      target: "date",
      role: "primary",
      endMeaningId: "lost",
    },
    {
      id: "discovered",
      label: "Discovered",
      kind: "point",
      target: "anchor",
      anchorType: "discovered",
    },
    {
      id: "lost",
      label: "Lost",
      kind: "point",
      target: "anchor",
      anchorType: "lost",
      role: "end",
    },
    {
      id: "ownershipPeriod",
      label: "Ownership period",
      kind: "span",
      target: "anchor",
      anchorType: "ownershipPeriod",
    },
    {
      id: "recovered",
      label: "Recovered",
      kind: "point",
      target: "anchor",
      anchorType: "recovered",
    },
    customMeaning,
  ],
  note: [
    {
      id: "associatedDate",
      label: "Associated date",
      kind: "point",
      target: "date",
      role: "primary",
    },
    {
      id: "associatedPeriod",
      label: "Associated period",
      kind: "span",
      target: "anchor",
      anchorType: "associatedPeriod",
    },
    customMeaning,
  ],
};

export const GENERIC_MEANINGS: TemporalMeaning[] = [
  {
    id: "date",
    label: "Date",
    kind: "point",
    target: "date",
    role: "primary",
    endMeaningId: "end_date",
  },
  {
    id: "range",
    label: "Relevant period",
    kind: "span",
    target: "start_date",
    role: "begin",
    endMeaningId: "end_date",
  },
  {
    id: "end_date",
    label: "End date",
    kind: "point",
    target: "end_date",
    role: "end",
  },
  customMeaning,
];

export function getMeanings(entityType: string): TemporalMeaning[] {
  return MEANING_SETS[entityType] ?? GENERIC_MEANINGS;
}

export function getBeginMeaning(entityType: string): TemporalMeaning {
  return (
    getMeanings(entityType).find(
      (meaning) => meaning.role === "primary" || meaning.role === "begin",
    ) ?? GENERIC_MEANINGS[0]
  );
}

export function getEndMeaning(entityType: string): TemporalMeaning | undefined {
  const meanings = getMeanings(entityType);
  const begin = getBeginMeaning(entityType);
  return (
    meanings.find((meaning) => meaning.id === begin.endMeaningId) ??
    meanings.find((meaning) => meaning.role === "end")
  );
}
