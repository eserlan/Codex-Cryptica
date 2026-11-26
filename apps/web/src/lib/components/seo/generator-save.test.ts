import { describe, expect, it } from "vitest";
import { GuestExporter } from "@codex/vault-engine";
import type { Entity } from "schema";
import type { SessionEntity } from "generator-engine";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import {
  buildGeneratorSavePayload,
  buildHubSaveDrafts,
} from "./generator-save";
import { getGeneratorDocumentLayout } from "./generator-document-layout";

const baseOutput: GeneratorOutput = {
  type: "location",
  title: "The Hollow Crown",
  summary: "A fallen order.",
  content: "The order once ruled the city.",
  lore: "A sanctuary lies beneath the city.",
  labels: ["faction"],
  status: "draft",
};

describe("generator save payloads", () => {
  it("builds a normal vault payload from the rendered document layout", () => {
    expect(
      buildGeneratorSavePayload(baseOutput, {
        content: "## Control\n\nThey command the gates.",
        lore: "The sanctuary lies beneath the city.",
      }),
    ).toMatchObject({
      type: "location",
      content: "*A fallen order.*\n\n## Control\n\nThey command the gates.",
      lore: "The sanctuary lies beneath the city.",
    });
  });

  it("keeps a renamed ship secret in GM lore through save and guest export", () => {
    const secret = "The ship was declared lost ten years ago.";
    const output = {
      ...baseOutput,
      type: "location",
      status: "active",
      content: "## Core Concept\nA worn freighter.",
      lore: `### Ship's Secret\n${secret}`,
      labels: ["rpg-ship", "imported-draft"],
    } satisfies GeneratorOutput;
    const layout = getGeneratorDocumentLayout(output);
    const payload = buildGeneratorSavePayload(output, layout);

    expect(payload.content).not.toContain(secret);
    expect(payload.lore).toContain(secret);

    const entity = {
      id: "ship-1",
      type: payload.type,
      title: payload.title,
      content: payload.content,
      lore: payload.lore,
      labels: payload.labels,
      status: payload.status,
      aliases: [],
      connections: [],
    } satisfies Entity;
    const bundle = GuestExporter.export({
      entities: [entity],
      defaultVisibility: "visible",
      activeTheme: { primaryColor: "#000000" },
      publishId: "ship-export-test",
      vaultTitle: "Test Vault",
      publisherVersion: "test",
    });

    expect(JSON.stringify(bundle)).not.toContain(secret);
  });

  it("keeps council member stances and persuasion routes out of guest exports", () => {
    const roster =
      "### Council Members\n- **Ossian Thale** — Initial stance: Leaning. A recorded vote can expose his secret allegiance.";
    const output = {
      ...baseOutput,
      type: "event",
      content: "### The Proposal\nApprove the harbour levy.",
      lore: `${roster}\n\n### Investigation Leads\nReview the harbourmaster's manifest.`,
      labels: ["council-vote", "political-intrigue"],
      status: "active",
    } satisfies GeneratorOutput;
    const layout = getGeneratorDocumentLayout(output);
    const payload = buildGeneratorSavePayload(output, layout);

    expect(payload.lore).toContain(roster);
    expect(payload.content).not.toContain("Council Members");

    const entity = {
      id: "council-vote-1",
      type: payload.type,
      title: payload.title,
      content: payload.content,
      lore: payload.lore,
      labels: payload.labels,
      status: payload.status,
      aliases: [],
      connections: [],
    } satisfies Entity;
    const bundle = GuestExporter.export({
      entities: [entity],
      defaultVisibility: "visible",
      activeTheme: { primaryColor: "#000000" },
      publishId: "council-vote-export-test",
      vaultTitle: "Test Vault",
      publisherVersion: "test",
    });

    expect(JSON.stringify(bundle)).not.toContain("Ossian Thale");
    expect(JSON.stringify(bundle)).not.toContain("Initial stance: Leaning");
    expect(JSON.stringify(bundle)).not.toContain("secret allegiance");
  });

  it("keeps adventure lore in the vault and omits empty map images", () => {
    const adventure = {
      ...baseOutput,
      kind: "adventure",
      labels: ["adventure"],
    } satisfies GeneratorOutput;

    expect(
      buildGeneratorSavePayload(adventure, {
        content: "## Scenario",
        lore: "Unused rendered lore",
      }),
    ).toEqual({
      type: "note",
      kind: "adventure",
      title: "The Hollow Crown",
      content: "*A fallen order.*",
      lore: "The order once ruled the city.\n\nA sanctuary lies beneath the city.",
      labels: ["adventure"],
      status: "draft",
    });
  });

  it("resolves only provenance references that are present in the saved selection", () => {
    const first: SessionEntity = {
      id: "one",
      type: "note",
      title: "First",
      content: "One",
      lore: "",
      labels: [],
      status: "draft",
      reuseEnabled: true,
      pinned: false,
      createdOrder: 1,
    };
    const second = { ...first, id: "two", title: "Second", createdOrder: 2 };

    const drafts = buildHubSaveDrafts(
      [second],
      {
        two: {
          resultEntityId: "two",
          usedEntityIds: ["one", "missing"],
          offeredEntityIds: ["one", "missing"],
          trimmed: false,
        },
      },
      [first, second],
    );

    expect(drafts[0].references).toEqual(["First"]);
  });

  it("formats Tales of the Valiant magic item mechanics into Game Statistics markdown section and metadata", () => {
    const tovMagicItem: GeneratorOutput = {
      type: "item",
      title: "Ring of Shadow Step",
      summary: "A ring forged of darkened silver.",
      content: "Forged in the deep gloom.",
      lore: "Wearers can slip between shadows.",
      labels: ["magic-item"],
      status: "draft",
      systemId: "tales-of-the-valiant",
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-magic-item",
        isHomebrew: false,
        data: {
          rarity: "Rare",
          category: "Ring",
          attunement: true,
          attunementRequirement:
            "by a rogue or shadow caster ![pixel](https://tracker.example/attunement.png)",
          activationAction: "Bonus Action",
          charges: 3,
          rechargeRate:
            "recharges 1d3 at dusk ![pixel](https://tracker.example/recharge.png)",
          savingThrowDc: 15,
          rulesText:
            'As a bonus action, teleport up to 30 feet. ![map](https://tracker.example/pixel.png) <img src="https://tracker.example/raw.png">',
          isHomebrew: false,
        },
      },
    };

    const payload = buildGeneratorSavePayload(tovMagicItem, {
      content: "## Description\nA ring of silver.",
      lore: "Wearers can slip between shadows.",
    });

    expect(payload.lore).toContain(
      "### Game Statistics (Tales of the Valiant)",
    );
    expect(payload.lore).toContain("- **Rarity & Category:** Rare Ring");
    expect(payload.lore).toContain(
      "- **Attunement:** Requires attunement (by a rogue or shadow caster pixel)",
    );
    expect(payload.lore).toContain("- **Activation:** Bonus Action");
    expect(payload.lore).toContain(
      "- **Charges:** 3 (recharges 1d3 at dusk pixel)",
    );
    expect(payload.lore).toContain("- **Saving Throw DC:** 15");
    expect(payload.lore).toContain("teleport up to 30 feet");
    expect(payload.lore).not.toContain("tracker.example");
    expect(payload.lore).not.toContain("![map]");
    expect(payload.systemId).toBe("tales-of-the-valiant");
    expect(payload.metadata).toEqual({
      tovMechanics: tovMagicItem.mechanics?.data,
    });
  });

  it("appends sanitized Tales of the Valiant encounter mechanics and published BFRD Doom guidance on save", () => {
    const tovEncounter: GeneratorOutput = {
      ...baseOutput,
      type: "event",
      kind: "encounter",
      systemId: "tales-of-the-valiant",
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-encounter",
        isHomebrew: false,
        data: {
          qualitativeDifficulty: "Dangerous for 4 Level 3 characters",
          recommendedCrRange: "CR 1–2 minions with a CR 4 commander",
          suggestedCreatures: [
            {
              name: "Shadow Hound",
              cr: "1",
              count: 3,
              role: "Skirmisher",
              isHomebrew: false,
            },
            {
              name: "Gloom Caller",
              cr: "4",
              count: 1,
              role: "Controller / Boss",
              isHomebrew: true,
            },
          ],
          tacticalAdvice: "The caller blinds foes while hounds attack flanks.",
          doomNotes:
            "Start the encounter with a CR-based GM Doom pool of 3 points. Spend Doom to give a creature advantage on an attack, give a PC disadvantage on a save, or once per encounter recharge or gain one additional use of a limited-use feature.",
          isHomebrew: false,
        },
      },
    };

    const payload = buildGeneratorSavePayload(tovEncounter, {
      content: "### What the Players See\nGloom gathers in the corridor.",
      lore: "### Situation & Stakes\nThe pack hunts here.",
    });

    expect(payload.lore).toContain(
      "### Game Mechanics & Challenge Guidance (Tales of the Valiant)",
    );
    expect(payload.lore).toContain(
      "- **Challenge Assessment:** Dangerous for 4 Level 3 characters",
    );
    expect(payload.lore).toContain(
      "- **Recommended CR Distribution:** CR 1–2 minions with a CR 4 commander",
    );
    expect(payload.lore).toContain("- **Suggested Participants:**");
    expect(payload.lore).toContain("  - 3x Shadow Hound (CR 1, Skirmisher)");
    expect(payload.lore).toContain(
      "  - 1x Gloom Caller (CR 4, Controller / Boss) *(Homebrew)*",
    );
    expect(payload.lore).toContain(
      "- **Tactical Guidance:** The caller blinds foes while hounds attack flanks.",
    );
    expect(payload.lore).toContain(
      "- **Doom Guidance:** Start the encounter with a CR-based GM Doom pool of 3 points. Spend Doom to give a creature advantage on an attack, give a PC disadvantage on a save, or once per encounter recharge or gain one additional use of a limited-use feature.",
    );
    expect(payload.lore).not.toMatch(/\*\*Doom Guidance:\*\*.*\(Homebrew\)/);
    expect(payload.systemId).toBe("tales-of-the-valiant");
    expect(payload.metadata).toEqual({
      tovMechanics: tovEncounter.mechanics?.data,
    });
  });

  it("labels custom creature-specific Doom spends as homebrew when saving ToV encounter mechanics", () => {
    const homebrewEncounter: GeneratorOutput = {
      ...baseOutput,
      type: "event",
      kind: "encounter",
      systemId: "tales-of-the-valiant",
      mechanics: {
        systemId: "tales-of-the-valiant",
        kind: "tov-encounter",
        isHomebrew: true,
        data: {
          qualitativeDifficulty: "Dangerous for 4 Level 3 characters",
          recommendedCrRange: "Single CR 4 boss",
          suggestedCreatures: [
            {
              name: "Gloom Caller",
              cr: "4",
              count: 1,
              role: "Controller / Boss",
              isHomebrew: true,
            },
          ],
          tacticalAdvice: "Uses gloom to isolate the party.",
          doomNotes: "Spend 2 Doom to summon a Shadow Minion.",
          isHomebrew: true,
        },
      },
    };

    const payload = buildGeneratorSavePayload(homebrewEncounter, {
      content: "### What the Players See\nGloom gathers in the corridor.",
      lore: "### Situation & Stakes\nThe pack hunts here.",
    });

    expect(payload.lore).toContain(
      "- **Doom Guidance:** Spend 2 Doom to summon a Shadow Minion. *(Homebrew)*",
    );
  });
});
