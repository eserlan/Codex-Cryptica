import { calendarEngine } from "chronology-engine";
import type { WorldCalendar } from "chronology-engine";
import type {
  AdventureSession,
  PlayerCharacter,
  SourceRecordReference,
  WorldEntryContext,
} from "@codex/adventure-engine";
import {
  validateWorldEntrySetup,
  worldEntryCharacter,
  worldEntryLocationName,
  worldEntryTitle,
  type WorldEntryChoice,
  type WorldEntrySetup,
} from "./world-entry-setup";

/** Retains canonical IDs and the actual date, without storing Vault bodies. */
export function createWorldEntryStart(
  setup: WorldEntrySetup,
  characters: readonly WorldEntryChoice[],
  locations: readonly WorldEntryChoice[],
  calendar: WorldCalendar,
): {
  vaultId: string;
  title: string;
  premise: string;
  playerCharacter: PlayerCharacter;
  sourceRecords: SourceRecordReference[];
  worldEntry: WorldEntryContext;
} {
  const errors = validateWorldEntrySetup(
    setup,
    characters,
    locations,
    calendar,
  );
  if (errors.length) throw new Error(errors.join(" "));
  const character = worldEntryCharacter(setup, characters);
  const locationName = worldEntryLocationName(setup, locations);
  const location: WorldEntryContext["location"] = setup.locationId
    ? { kind: "canonical", recordId: setup.locationId, name: locationName }
    : { kind: "provisional", name: locationName };
  const when = setup.at
    ? " World date: " + calendarEngine.format(setup.at, calendar) + "."
    : " World date is unspecified; do not invent an exact year.";
  const intent =
    setup.intent === "scene"
      ? " Begin with this situation: " +
        setup.scenePrompt.trim().slice(0, 280) +
        "."
      : setup.intent === "opportunity"
        ? " Present a plausible local situation, not an assigned quest."
        : " Begin with ordinary local life; the player may explore freely.";
  const premise = (
    "Place: " +
    locationName +
    "." +
    when +
    intent +
    " Let the player choose what to do."
  ).slice(0, 600);
  const sourceRecords: AdventureSession["sourceRecords"] = [];
  if (character.kind === "canonical") {
    sourceRecords.push({
      recordId: character.recordId,
      recordType: "character",
      displayName: character.name,
      role: "player-character",
      availability: "available",
    });
  }
  if (location.kind === "canonical") {
    sourceRecords.push({
      recordId: location.recordId,
      recordType: "location",
      displayName: location.name,
      role: "anchor",
      availability: "available",
    });
  }
  return {
    vaultId: setup.vaultId,
    title: worldEntryTitle(setup, characters, locations).slice(0, 600),
    premise,
    playerCharacter: character,
    sourceRecords,
    worldEntry: {
      version: 1,
      location,
      // DateSelection and TemporalMetadata have only primitive fields. A shallow
      // copy deliberately unwraps Svelte $state proxies (which structuredClone
      // rejects with DataCloneError) while retaining year-only precision.
      ...(setup.at ? { at: { ...setup.at } } : {}),
      intent: setup.intent,
      ...(setup.intent === "scene"
        ? { scenePrompt: setup.scenePrompt.trim().slice(0, 600) }
        : {}),
    },
  };
}

/** Keep errors actionable without leaking private Vault/Oracle payloads. */
export function describeWorldEntryStartFailure(
  cause: unknown,
  stage: "setup" | "launch",
): string {
  const preserved = "Your setup has been preserved.";
  if (cause instanceof Error) {
    switch (cause.message) {
      case "active-adventure-exists":
        return "An adventure is already active. Continue it or archive it first.";
      case "vault-not-open":
        return "The selected Vault is no longer open. Reopen it and retry. " + preserved;
      case "control-lost":
        return "Another tab controls this adventure. Switch to that tab and retry. " + preserved;
      case "invalid-session-id":
        return "The new adventure could not be saved. Reopen the Vault and retry. " + preserved;
    }
    if (
      cause.message.startsWith("Choose a Vault before starting.") ||
      cause.message.startsWith("Choose a character") ||
      cause.message.startsWith("Choose a location") ||
      cause.message.startsWith("Describe the scene") ||
      cause.message.startsWith("Choose a valid date")
    ) {
      return cause.message + " " + preserved;
    }
    switch (cause.name) {
      case "DataCloneError":
        return "The selected world date could not be prepared. Try clearing and reselecting it. " + preserved;
      case "QuotaExceededError":
        return "Device storage is full. Free up some space and retry. " + preserved;
      case "NotAllowedError":
      case "SecurityError":
        return "This browser cannot access the Vault storage. Check its site permissions. " + preserved;
    }
  }
  return stage === "setup"
    ? "Could not prepare the scene from the current selections. Check the character, place and date. " + preserved
    : "The adventure could not be launched. Check your Oracle connection and Vault, then retry. " + preserved;
}
