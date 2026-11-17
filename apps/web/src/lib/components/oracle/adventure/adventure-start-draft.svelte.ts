import {
  MAX_TEXT_CHARS,
  type AdventureJsonV1,
  type AdventureSourcePackageRef,
} from "@codex/adventure-engine";
import type { PendingAdventureHandoff } from "#lib/stores/oracle/rumour-adventure-handoff.svelte.js";

function packagePremise(pkg: AdventureJsonV1): string {
  const parts = [pkg.premise.hook.trim(), pkg.premise.background.trim()].filter(
    Boolean,
  );
  const combined = parts.join("\n\n") || pkg.description?.trim() || pkg.title;
  if (combined.length <= MAX_TEXT_CHARS) return combined;
  return `${combined.slice(0, MAX_TEXT_CHARS - 1).trimEnd()}…`;
}

/** Owned by the surface so a failed opening cannot unmount and erase its draft. */
export class AdventureStartDraft {
  approach = $state<
    "choose" | "premise" | "world" | "preview" | "import-review"
  >("choose");
  title = $state("");
  premise = $state("");
  characterId = $state("");
  characterName = $state("");
  characterDescription = $state("");
  sourcePackage = $state<AdventureSourcePackageRef | undefined>(undefined);
  private previouslyPrefilledScenario: string | null = null;

  reset(): void {
    this.approach = "choose";
    this.title = "";
    this.premise = "";
    this.characterId = "";
    this.characterName = "";
    this.characterDescription = "";
    this.sourcePackage = undefined;
  }

  fromPackage = (pkg: AdventureJsonV1, hash: string): void => {
    this.title = pkg.title.slice(0, MAX_TEXT_CHARS);
    this.premise = packagePremise(pkg);
    this.sourcePackage = {
      packageId: pkg.id,
      version: pkg.version,
      formatVersion: pkg.formatVersion,
      hash,
    };
    this.approach = "premise";
  };

  prefillRumour(pending: PendingAdventureHandoff | null): void {
    if (!pending) {
      this.previouslyPrefilledScenario = null;
      return;
    }
    if (this.previouslyPrefilledScenario === pending.scenario.id) return;
    this.previouslyPrefilledScenario = pending.scenario.id;
    const selected = pending.selected;
    if ("index" in selected) {
      this.title =
        "Rumour " + selected.index + ": " + selected.playerVisible.lead;
      this.premise = selected.playerVisible.rumour;
    } else {
      this.title =
        pending.adventureTitle || selected.playerVisible.title || "Adventure";
      this.premise = pending.scenario.playerVisible.rumour;
    }
  }
}
