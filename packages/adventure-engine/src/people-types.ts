export interface AdventurePerson {
  id: string;
  name: string;
  aliases: string[];
  linkedFactIds: string[];
  sourceRecordId?: string;
}

export interface PersonResolutionInput {
  id?: string;
  name?: string;
  alias?: string;
  factId?: string;
  sourceRecordId?: string;
  kind: "person" | string;
  visibility: "player-visible" | "gm-only" | string;
}

export interface PersonResolutionResult {
  people: AdventurePerson[];
  person: AdventurePerson | null;
  reason?: "hidden" | "invalid" | "ambiguous" | "capacity" | "missing";
}
