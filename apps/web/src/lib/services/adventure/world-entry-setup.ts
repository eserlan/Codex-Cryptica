import { calendarEngine } from "chronology-engine";
import type {
  DateSelection,
  TemporalMetadata,
  WorldCalendar,
} from "chronology-engine";
import type { PlayerCharacter } from "@codex/adventure-engine";

export type WorldEntryIntent = "explore" | "scene" | "opportunity";

/** All selections are Vault-local. Nothing in this draft is written to canon. */
export interface WorldEntrySetup {
  vaultId: string;
  characterId: string;
  provisionalCharacterName: string;
  provisionalCharacterDescription: string;
  locationId: string;
  provisionalLocationName: string;
  at?: DateSelection | TemporalMetadata;
  intent: WorldEntryIntent;
  scenePrompt: string;
}

export interface WorldEntryChoice {
  id: string;
  name: string;
}

export function emptyWorldEntrySetup(vaultId: string): WorldEntrySetup {
  return {
    vaultId,
    characterId: "",
    provisionalCharacterName: "",
    provisionalCharacterDescription: "",
    locationId: "",
    provisionalLocationName: "",
    intent: "explore",
    scenePrompt: "",
  };
}

export function validateWorldEntrySetup(
  draft: WorldEntrySetup,
  characters: readonly WorldEntryChoice[],
  locations: readonly WorldEntryChoice[],
  calendar: WorldCalendar,
): string[] {
  const errors: string[] = [];
  if (!draft.vaultId.trim()) errors.push("Choose a Vault before starting.");
  if (draft.characterId) {
    if (!characters.some((character) => character.id === draft.characterId)) {
      errors.push("Choose a character from this Vault.");
    }
  } else if (!draft.provisionalCharacterName.trim()) {
    errors.push("Choose a character or provide a character name.");
  }
  if (draft.locationId) {
    if (!locations.some((location) => location.id === draft.locationId)) {
      errors.push("Choose a location from this Vault.");
    }
  } else if (!draft.provisionalLocationName.trim()) {
    errors.push("Choose a location or name a starting place.");
  }
  if (draft.at && !calendarEngine.isValid(draft.at, calendar)) {
    errors.push("Choose a valid date in this Vault's calendar.");
  }
  if (draft.intent === "scene" && !draft.scenePrompt.trim()) {
    errors.push("Describe the scene you have in mind.");
  }
  return errors;
}

export function worldEntryCharacter(
  draft: WorldEntrySetup,
  characters: readonly WorldEntryChoice[],
): PlayerCharacter {
  const selected = characters.find(
    (character) => character.id === draft.characterId,
  );
  if (selected) {
    return { kind: "canonical", recordId: selected.id, name: selected.name };
  }
  return {
    kind: "provisional",
    name: draft.provisionalCharacterName.trim(),
    description:
      draft.provisionalCharacterDescription.trim() ||
      draft.provisionalCharacterName.trim(),
  };
}

export function worldEntryLocationName(
  draft: WorldEntrySetup,
  locations: readonly WorldEntryChoice[],
): string {
  return (
    locations.find((location) => location.id === draft.locationId)?.name ??
    draft.provisionalLocationName.trim()
  );
}

/** Stable title without a manufactured quest objective. */
export function worldEntryTitle(
  draft: WorldEntrySetup,
  characters: readonly WorldEntryChoice[],
  locations: readonly WorldEntryChoice[],
): string {
  return (
    worldEntryCharacter(draft, characters).name +
    " in " +
    worldEntryLocationName(draft, locations)
  );
}

/**
 * Bounded picker rows. The current selection is listed first so truncation
 * can never hide the record that will be used at launch.
 */
export function visibleWorldEntryChoices(
  rows: readonly WorldEntryChoice[],
  selectedId: string,
  search: string,
  limit = 80,
): WorldEntryChoice[] {
  const needle = search.toLocaleLowerCase();
  const selected = rows.find((row) => row.id === selectedId);
  const matches = rows.filter(
    (row) =>
      row.id !== selectedId && row.name.toLocaleLowerCase().includes(needle),
  );
  return [...(selected ? [selected] : []), ...matches].slice(0, limit);
}
