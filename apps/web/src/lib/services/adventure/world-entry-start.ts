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

/** Setup validation failure; its messages are fixed, user-safe copy. */
export class WorldEntrySetupError extends Error {
  constructor(readonly messages: readonly string[]) {
    super(messages.join(" "));
    this.name = "WorldEntrySetupError";
  }
}

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
  if (errors.length) throw new WorldEntrySetupError(errors);
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
  const message = cause instanceof Error ? cause.message : "";
  if (message === "vault-not-open") {
    return "Reopen the selected Vault and retry. Your setup has been preserved.";
  }
  if (message === "control-lost") {
    return "Another tab controls this adventure. Use that tab and retry.";
  }
  if (message === "invalid-session-id") {
    return "Could not save the new adventure. Reopen the Vault and retry.";
  }
  // Only the exact messages produced by validateWorldEntrySetup are shown, and
  // only while validating setup. Any other error text could carry Vault data.
  if (stage === "setup" && cause instanceof WorldEntrySetupError) {
    return cause.messages.join(" ") + " Your setup has been preserved.";
  }

  // DOMException may come from another browser/test realm and not extend Error.
  if (cause !== null && typeof cause === "object" && "name" in cause) {
    switch (cause.name) {
      case "DataCloneError":
        return "Could not process the selected world date. Reselect it. Your setup has been preserved.";
      case "QuotaExceededError":
        return "Device storage is full. Free some space and retry. Your setup has been preserved.";
      case "NotAllowedError":
      case "SecurityError":
        return "Check this site's Vault storage permissions. Your setup has been preserved.";
    }
  }

  if (stage === "setup") {
    return "Check your character, place and date. Your setup has been preserved.";
  }
  return "Could not start the adventure. Check Oracle and the Vault. Your setup has been preserved.";
}
