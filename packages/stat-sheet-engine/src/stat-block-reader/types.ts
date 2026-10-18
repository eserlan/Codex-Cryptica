import type { StatSheet, StatSheetField } from "schema";

export type ImportMode = "copy" | "convert-5e";
export type ReaderKind = "ai" | "rules";
export type SheetKind = "creature" | "npc";
export type ReadOutcome = "ok" | "no-stat-block" | "several" | "character";
export type LooksLike = "tov" | "5e" | "unknown";
export type NoteState = "check" | "converted" | "derived";
export type NoteReason =
  | "uncertain"
  | "malformed"
  | "not-in-source"
  | "out-of-range"
  | "unmarked-change"
  | "converted"
  | "from-cr";
export type StatBlockReadReason = "timeout" | "gateway" | "malformed";

export interface ImportRequest {
  source: string;
  mode: ImportMode;
  kindHint?: SheetKind;
  reader: ReaderKind;
}

export interface FieldNote {
  path: string;
  state: NoteState;
  reason: NoteReason;
  source?: string;
  original?: string | null;
}

export interface Leftover {
  label: string;
  text: string;
}

export interface Candidate {
  name: string;
  index: number;
}

export type AbilityKey = "str" | "dex" | "con" | "int" | "wis" | "cha";

export type AbilityScores = Partial<Record<AbilityKey, number | null>>;

export interface NamedText {
  name: string;
  description?: string | null;
}

export interface ActionValue {
  name: string;
  attackFormula?: string | null;
  damageFormula?: string | null;
  description?: string | null;
}

export interface LegendaryValue {
  name: string;
  cost?: number | null;
  description?: string | null;
}

/** Every leaf is optional and nullable. Nothing has a default. */
export interface CreatureValues {
  size?: string | null;
  creatureType?: string | null;
  subtype?: string | null;
  alignment?: string | null;
  cr?: string | null;
  proficiencyBonus?: number | null;
  doom?: number | null;
  ac?: number | null;
  acDetails?: string | null;
  hp?: number | null;
  hitDice?: string | null;
  speed?: string | null;
  abilityScores?: AbilityScores | null;
  saveProficiencies?: string[] | null;
  skillProficiencies?: string[] | null;
  damageVulnerabilities?: string[] | null;
  damageResistances?: string[] | null;
  damageImmunities?: string[] | null;
  conditionImmunities?: string[] | null;
  senses?: string | null;
  languages?: string | null;
  traits?: NamedText[] | null;
  actions?: ActionValue[] | null;
  bonusActions?: ActionValue[] | null;
  reactions?: ActionValue[] | null;
  legendaryActions?: LegendaryValue[] | null;
}

export interface NpcValues {
  cr?: string | null;
  ac?: number | null;
  hp?: number | null;
  hitDice?: string | null;
  speed?: string | null;
  attackName?: string | null;
  attackBonus?: number | null;
  attackFormula?: string | null;
  damageFormula?: string | null;
  damageType?: string | null;
  luck?: number | null;
  abilityScores?: AbilityScores | null;
  keySaves?: string[] | null;
  keySkills?: string[] | null;
  notes?: string | null;
}

export type ReadValues = CreatureValues | NpcValues;

/** What the review screen edits. Produced by both readers. */
export interface ReadResult {
  outcome: ReadOutcome;
  candidates: Candidate[];
  looksLike: LooksLike;
  kind: SheetKind;
  name: string | null;
  values: ReadValues;
  notes: FieldNote[];
  leftovers: Leftover[];
  reader: ReaderKind;
  /** Value paths the GM has edited. Edited values count as found. */
  corrected: string[];
}

export interface FieldWrite {
  fieldId: string;
  before: unknown;
  after: Partial<StatSheetField>;
}

export interface MergePlan {
  templateId: string;
  writes: FieldWrite[];
  overwrites: FieldWrite[];
  untouched: string[];
  blocked: "template-mismatch" | "missing-required" | null;
}

export type { StatSheet };
