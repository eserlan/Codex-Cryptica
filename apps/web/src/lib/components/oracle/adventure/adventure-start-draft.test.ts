import { describe, expect, it } from "vitest";
import { MAX_TEXT_CHARS, type AdventureJsonV1 } from "@codex/adventure-engine";
import sample from "../../../../../static/schemas/adventure-json/examples/minimal.v1.json";
import type { PendingAdventureHandoff } from "#lib/stores/oracle/rumour-adventure-handoff.svelte.js";
import { AdventureStartDraft } from "./adventure-start-draft.svelte.js";

describe("adventure start draft", () => {
  it("pins an approved package and combines hook and background in order", () => {
    const draft = new AdventureStartDraft();
    const pkg = sample as AdventureJsonV1;
    draft.fromPackage(pkg, "hash-1");
    expect(draft.title).toBe(pkg.title);
    expect(draft.premise).toBe(
      `${pkg.premise.hook.trim()}\n\n${pkg.premise.background.trim()}`,
    );
    expect(draft.sourcePackage).toEqual({
      packageId: pkg.id,
      version: pkg.version,
      formatVersion: pkg.formatVersion,
      hash: "hash-1",
    });
    expect(draft.approach).toBe("premise");
  });

  it("bounds imported title and premise text without losing the package pin", () => {
    const draft = new AdventureStartDraft();
    const pkg = {
      ...sample,
      title: "x".repeat(MAX_TEXT_CHARS + 20),
      premise: { hook: "h".repeat(MAX_TEXT_CHARS), background: "more" },
    } as AdventureJsonV1;
    draft.fromPackage(pkg, "hash-1");
    expect(draft.title).toHaveLength(MAX_TEXT_CHARS);
    expect(draft.premise).toHaveLength(MAX_TEXT_CHARS);
    expect(draft.premise.endsWith("…")).toBe(true);
    expect(draft.sourcePackage?.hash).toBe("hash-1");
  });

  it("falls back to a description then title when a package has no premise text", () => {
    const draft = new AdventureStartDraft();
    const pkg = {
      ...sample,
      premise: { hook: " ", background: " " },
      description: " A description. ",
    } as AdventureJsonV1;
    draft.fromPackage(pkg, "hash");
    expect(draft.premise).toBe("A description.");
    draft.fromPackage({ ...pkg, description: undefined }, "hash");
    expect(draft.premise).toBe(pkg.title);
  });

  it("clears all unsaved fields and package selection on a Vault reset", () => {
    const draft = new AdventureStartDraft();
    draft.fromPackage(sample as AdventureJsonV1, "hash");
    draft.characterId = "lira";
    draft.characterName = "Lira";
    draft.characterDescription = "A traveller.";
    draft.reset();
    expect(draft.title).toBe("");
    expect(draft.premise).toBe("");
    expect(draft.characterId).toBe("");
    expect(draft.characterName).toBe("");
    expect(draft.characterDescription).toBe("");
    expect(draft.sourcePackage).toBeUndefined();
    expect(draft.approach).toBe("choose");
  });

  it("prefills a rumour once, preserving player edits until a different selection", () => {
    const draft = new AdventureStartDraft();
    const pending = {
      scenario: { id: "rumour-1" },
      selected: {
        index: 2,
        playerVisible: { lead: "Old Mill", rumour: "The miller vanished." },
      },
    } as PendingAdventureHandoff;
    draft.prefillRumour(pending);
    expect(draft.title).toBe("Rumour 2: Old Mill");
    expect(draft.premise).toBe("The miller vanished.");
    draft.title = "Player's title";
    draft.prefillRumour(pending);
    expect(draft.title).toBe("Player's title");
    draft.prefillRumour(null);
    draft.prefillRumour(pending);
    expect(draft.title).toBe("Rumour 2: Old Mill");
  });

  it("prefills a prepared adventure from its title and scenario's player-visible premise", () => {
    const draft = new AdventureStartDraft();
    const pending = {
      adventureTitle: "The Spire",
      scenario: {
        id: "adventure-1",
        playerVisible: { rumour: "The spire hums." },
      },
      selected: { playerVisible: { title: "Alternate title" } },
    } as PendingAdventureHandoff;
    draft.prefillRumour(pending);
    expect(draft.title).toBe("The Spire");
    expect(draft.premise).toBe("The spire hums.");
  });
});
