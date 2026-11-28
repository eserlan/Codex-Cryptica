import { describe, expect, it } from "vitest";
import { GuestExporter } from "@codex/vault-engine";
import type { Entity } from "schema";
import type { SessionEntity } from "generator-engine";
import { generateHolidayLocal, generateNpcLocal } from "generator-engine";
import type { GeneratorOutput } from "#lib/services/seo/generator-engine.js";
import {
  buildGeneratorSavePayload,
  buildHubSaveDrafts,
} from "./generator-save";
import { getGeneratorDocumentLayout } from "./generator-document-layout";
import { slugDrafts } from "./generator-page-drafts";

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
  it("keeps a quest's hidden beats out of the saved Event's public content even when the preview moves them into its main column", () => {
    const output: GeneratorOutput = {
      ...baseOutput,
      type: "event",
      title: "The Millrace Ultimatum",
      content: "### The Hook\nThe village needs water.",
      lore: "### Complication\nThe bridge may wash away.\n\n### The Twist\nThe deed is forged.\n\n### Reward\nA purse of silver.",
      labels: ["rpg-quest", "quest-generator", "imported-draft"],
    };
    const layout = getGeneratorDocumentLayout(output);
    expect(layout.content).toContain("The deed is forged.");
    const payload = buildGeneratorSavePayload(
      output,
      layout,
      undefined,
      "quest",
    );
    expect(payload.type).toBe("event");
    expect(payload.content).toContain("The village needs water.");
    expect(payload.content).not.toContain("The deed is forged.");
    expect(payload.lore).toBe(output.lore);
  });

  it("keeps Quest lore private when the model returns a different known generator label", () => {
    const output: GeneratorOutput = {
      ...baseOutput,
      type: "event",
      title: "The Millrace Ultimatum",
      content: "### The Hook\nThe village needs water.",
      lore: "### The Twist\nThe deed is forged.\n\n### Reward\nA purse of silver.",
      labels: ["rpg-quest", "npc-generator", "imported-draft"],
    };
    const layout = getGeneratorDocumentLayout(output);
    expect(layout.content).toContain("The deed is forged.");

    const payload = buildGeneratorSavePayload(
      output,
      layout,
      undefined,
      "quest",
    );

    expect(payload.content).not.toContain("The deed is forged.");
    expect(payload.lore).toContain("The deed is forged.");
    expect(payload.lore).toContain("A purse of silver.");
  });

  it.each([
    ["villain", "bbeg-generator", "imported-draft"],
    ["villain", "npc-generator", "imported-draft"],
    ["bbeg-generator", "adventure", "encounter"],
  ])(
    "keeps the full BBEG GM lore private in the saved Character and guest export (%s, %s, %s)",
    (...labels) => {
      const output = { ...slugDrafts["bbeg-generator"]!, labels };
      const layout = getGeneratorDocumentLayout(output);
      const secret = "requisition the abandoned land";
      // The public generator's reading layout promotes long-form narrative.
      expect(layout.content).toContain(secret);
      const payload = buildGeneratorSavePayload(
        output,
        layout,
        undefined,
        "bbeg-generator",
      );
      expect(payload.type).toBe("character");
      expect(payload.content).toBe(output.content);
      expect(payload.lore).toBe(output.lore);
      expect(payload.labels).toEqual(labels);
      expect(payload.content).not.toContain(secret);
      expect(payload.content).not.toContain("The Villain's Plan");
      const bundle = GuestExporter.export({
        entities: [
          {
            id: "bbeg-import",
            type: payload.type,
            title: payload.title,
            content: payload.content,
            lore: payload.lore,
            labels: payload.labels,
            status: payload.status,
            aliases: [],
            connections: [],
          } satisfies Entity,
        ],
        defaultVisibility: "visible",
        activeTheme: { primaryColor: "#000000" },
        publishId: "bbeg-export-test",
        vaultTitle: "Test Vault",
        publisherVersion: "test",
      });
      const exported = JSON.stringify(bundle);
      expect(exported).toContain(
        "Emergency notices bearing three blue triangles",
      );
      expect(exported).not.toContain(secret);
      expect(exported).not.toContain("The Villain's Plan");
      expect(exported).not.toContain("Bellan Cairn");
    },
  );

  it.each(["npc", "rpg-npc-generator"])(
    "preserves Full Dossier reference in GM notes and guest exports for %s",
    (key) => {
      const output = {
        ...generateNpcLocal(
          { role: "Guard", mode: "dossier", campaignContext: "Harbour gate" },
          () => 0.21,
        ),
        type: "character",
      } satisfies GeneratorOutput;
      const preview = getGeneratorDocumentLayout(output);
      expect(preview.content).toContain("Secrets & Hooks");
      const payload = buildGeneratorSavePayload(
        output,
        preview,
        undefined,
        key,
      );
      expect(payload).toMatchObject({
        type: "character",
        lore: output.lore,
        labels: output.labels,
      });
      for (const heading of [
        "Who they are",
        "What they want",
        "Why they are useful",
        "How to use them at the table",
      ])
        expect(payload.content).toContain(heading);
      for (const heading of [
        "Secret",
        "Immediate Hook",
        "Leverage & Price",
        "Faction Connection",
      ]) {
        expect(payload.content).not.toContain(heading);
        expect(payload.lore).toContain(heading);
      }
      const exported = JSON.stringify(
        GuestExporter.export({
          entities: [
            {
              id: "npc-1",
              type: payload.type,
              title: payload.title,
              content: payload.content,
              lore: payload.lore,
              labels: payload.labels,
              status: payload.status,
              aliases: [],
              connections: [],
            } satisfies Entity,
          ],
          defaultVisibility: "visible",
          activeTheme: { primaryColor: "#000000" },
          publishId: "npc-test",
          vaultTitle: "Test",
          publisherVersion: "test",
        }),
      );
      expect(exported).not.toContain("Immediate Hook");
      expect(exported).not.toContain("Leverage & Price");
      expect(exported).toContain("Who they are");
    },
  );

  it("keeps distinct and multiline Table Card secrets private even with misleading generated labels", () => {
    const output = {
      ...slugDrafts.npc!,
      content:
        "### The Six Elements\n- **Immediate Want**: Leave the town.\n- **Knowledge & Secrets**: First clue.\n  The hidden manifest is forged.\n  - **Concealed**: A second ledger.\n- **Sensory Tag**: Wet wool.\n\n### Table Delivery\nAsk for a boat.",
      lore: "### At a Glance\n- **Knowledge & Secrets**: Another clue.\n\n### Unexpected reference\nThe watch is compromised.",
      labels: ["npc-generator", "adventure", "encounter"],
    };
    const payload = buildGeneratorSavePayload(
      output,
      getGeneratorDocumentLayout(output),
      undefined,
      "npc",
    );
    expect(payload.type).toBe("character");
    expect(payload.content).toContain("Wet wool");
    expect(payload.content).toContain("Ask for a boat");
    for (const secret of [
      "First clue",
      "hidden manifest",
      "second ledger",
      "Another clue",
      "watch is compromised",
    ]) {
      expect(payload.content).not.toContain(secret);
      expect(payload.lore).toContain(secret);
    }
  });

  it("keeps normal Table Card's five cues and deduplicates its identical secret in GM notes", () => {
    const output = slugDrafts.npc!;
    const payload = buildGeneratorSavePayload(
      output,
      getGeneratorDocumentLayout(output),
      undefined,
      "npc",
    );
    expect(payload.content).toContain("Five public cues below");
    expect(payload.content).not.toContain("second manifest in her boot");
    expect(payload.lore.match(/second manifest in her boot/g)).toHaveLength(1);
    expect(payload.content).toContain("Table Delivery");
    expect(payload.lore).toContain("Faction Connection");
  });

  it("keeps controversial holiday history out of saved content and guest exports", () => {
    const output = {
      ...generateHolidayLocal(
        {
          setSize: "A calendar of 6 observances",
          includeControversial: true,
        },
        () => 0.21,
      ),
      type: "note",
    } satisfies GeneratorOutput;
    const hiddenTruth = output.observances?.[0]?.hiddenTruth;
    expect(hiddenTruth).toBeTruthy();

    const payload = buildGeneratorSavePayload(
      output,
      getGeneratorDocumentLayout(output),
    );
    expect(payload.content).not.toContain(hiddenTruth);
    expect(payload.lore).toContain(hiddenTruth);

    const entity = {
      id: "holiday-calendar",
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
      publishId: "holiday-export-test",
      vaultTitle: "Test Vault",
      publisherVersion: "test",
    });

    expect(JSON.stringify(bundle)).not.toContain(hiddenTruth);
  });

  it("keeps AI holiday hiddenTruth out of saved content and guest exports", async () => {
    const { parseHolidayResponse, resolveHoliday } =
      await import("generator-engine");
    const resolved = resolveHoliday({
      setSize: "One observance",
      includeControversial: true,
    });
    const aiHiddenTruth = "The harbour guild sank the first relief ship.";
    const publicFields = {
      name: "Lantern Tide",
      type: "Memorial",
      when: "First autumn gale",
      observers: "Dockward families",
      origin: "Honours sailors lost in the great storm.",
      traditions: "Float paper lanterns at dusk.",
      foodOrDress: "Salt cakes and oiled cloaks.",
      taboos: "Never extinguish a drifting lantern.",
      variations: "Outer-quay crews sing in low unison.",
      outsiderMisunderstanding: "Strangers mistake it for a harvest festival.",
      publicBelief: "The lanterns guide lost souls home.",
      tension: "No shipwright admits who built the doomed hull.",
    };
    const aiOutput = parseHolidayResponse(
      JSON.stringify({
        title: "Lantern Tide",
        summary: "A coastal memorial with a buried secret.",
        content: Object.values(publicFields).join("\n"),
        lore: `### Hidden Truth\n${aiHiddenTruth}`,
        observances: [{ ...publicFields, hiddenTruth: aiHiddenTruth }],
      }),
      resolved,
    ) as GeneratorOutput;

    const payload = buildGeneratorSavePayload(
      aiOutput,
      getGeneratorDocumentLayout(aiOutput),
    );
    expect(payload.content).not.toContain(aiHiddenTruth);
    expect(payload.lore).toContain(aiHiddenTruth);

    const bundle = GuestExporter.export({
      entities: [
        {
          id: "holiday-ai",
          type: payload.type,
          title: payload.title,
          content: payload.content,
          lore: payload.lore,
          labels: payload.labels,
          status: payload.status,
          aliases: [],
          connections: [],
        } satisfies Entity,
      ],
      defaultVisibility: "visible",
      activeTheme: { primaryColor: "#000000" },
      publishId: "holiday-ai-export-test",
      vaultTitle: "Test Vault",
      publisherVersion: "test",
    });
    expect(JSON.stringify(bundle)).not.toContain(aiHiddenTruth);

    const summaryLeakOutput = parseHolidayResponse(
      JSON.stringify({
        title: "Lantern Tide",
        summary: `Remembering the storm — ${aiHiddenTruth}`,
        content: Object.values(publicFields).join("\n"),
        lore: `### Hidden Truth\n${aiHiddenTruth}`,
        observances: [{ ...publicFields, hiddenTruth: aiHiddenTruth }],
      }),
      resolved,
    ) as GeneratorOutput;
    const summaryLeakPayload = buildGeneratorSavePayload(
      summaryLeakOutput,
      getGeneratorDocumentLayout(summaryLeakOutput),
    );
    expect(summaryLeakPayload.content).not.toContain(aiHiddenTruth);
    const summaryLeakBundle = GuestExporter.export({
      entities: [
        {
          id: "holiday-summary-leak",
          type: summaryLeakPayload.type,
          title: summaryLeakPayload.title,
          content: summaryLeakPayload.content,
          lore: summaryLeakPayload.lore,
          labels: summaryLeakPayload.labels,
          status: summaryLeakPayload.status,
          aliases: [],
          connections: [],
        } satisfies Entity,
      ],
      defaultVisibility: "visible",
      activeTheme: { primaryColor: "#000000" },
      publishId: "holiday-summary-leak-test",
      vaultTitle: "Test Vault",
      publisherVersion: "test",
    });
    expect(JSON.stringify(summaryLeakBundle)).not.toContain(aiHiddenTruth);
  });

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

  it("rejects council-vote payloads with a renamed roster heading before they can reach guest exports", async () => {
    const { buildCouncilVoteFoundationPrompt, readCouncilVoteFoundation } =
      await import("generator-engine");
    const { resolved } = buildCouncilVoteFoundationPrompt({});
    const leaked = readCouncilVoteFoundation(
      JSON.stringify({
        title: "Harbour Levy Vote",
        content:
          "### The Proposal\nApprove the harbour levy.\n\n### Voting Roster\n- **Ossian Thale** — Initial stance: Leaning. Secret allegiance.",
        lore: "### Voting Procedure\nSimple majority.\n\n### Current Vote Estimate\nTwo support.\n\n### Council Members\n- **Ossian Thale** — Leaning.\n\n### Antagonist Influence\nNone.\n\n### Investigation Leads\nCheck the manifest.",
      }),
      resolved,
    );

    expect(leaked).toBeNull();

    const indentedLeaked = readCouncilVoteFoundation(
      JSON.stringify({
        title: "Harbour Levy Vote",
        content:
          "### The Proposal\nApprove the harbour levy.\n\n   ### Council Members\n- **Ossian Thale** — Initial stance: Leaning. Secret allegiance.",
        lore: "### Voting Procedure\nSimple majority.\n\n### Current Vote Estimate\nTwo support.\n\n### Council Members\n- **Ossian Thale** — Leaning.\n\n### Antagonist Influence\nNone.\n\n### Investigation Leads\nCheck the manifest.",
      }),
      resolved,
    );

    expect(indentedLeaked).toBeNull();

    const fencedLoreLeaked = readCouncilVoteFoundation(
      JSON.stringify({
        title: "Harbour Levy Vote",
        content: "### The Proposal\nApprove the harbour levy.",
        lore: "### Voting Procedure\nSimple majority.\n\n### Current Vote Estimate\nTwo support.\n\n### Council Members\n- **Ossian Thale** — Leaning.\n\n### Antagonist Influence\nNone.\n\n### Investigation Leads\nCheck the manifest.\n\n```markdown\n### Hidden Bribe\nOssian Thale took gold.\n```",
      }),
      resolved,
    );

    expect(fencedLoreLeaked).toBeNull();

    const fencedContentLeaked = readCouncilVoteFoundation(
      JSON.stringify({
        title: "Harbour Levy Vote",
        content:
          "### The Proposal\nApprove the harbour levy.\n\n```markdown\n### Council Members\n- **Ossian Thale** — Secret allegiance.\n```",
        lore: "### Voting Procedure\nSimple majority.\n\n### Current Vote Estimate\nTwo support.\n\n### Council Members\n- **Ossian Thale** — Leaning.\n\n### Antagonist Influence\nNone.\n\n### Investigation Leads\nCheck the manifest.",
      }),
      resolved,
    );

    expect(fencedContentLeaked).toBeNull();

    const htmlHeadingContentLeaked = readCouncilVoteFoundation(
      JSON.stringify({
        title: "Harbour Levy Vote",
        content:
          "### The Proposal\nApprove the harbour levy.\n\n<h3>Council Members</h3>\n<p>Ossian Thale — Secret allegiance.</p>",
        lore: "### Voting Procedure\nSimple majority.\n\n### Current Vote Estimate\nTwo support.\n\n### Council Members\n- **Ossian Thale** — Leaning.\n\n### Antagonist Influence\nNone.\n\n### Investigation Leads\nCheck the manifest.",
      }),
      resolved,
    );

    expect(htmlHeadingContentLeaked).toBeNull();

    const fourSpaceIndentedLeaked = readCouncilVoteFoundation(
      JSON.stringify({
        title: "Harbour Levy Vote",
        content:
          "### The Proposal\nApprove the harbour levy.\n\n    ### Council Members\n    - **Ossian Thale** — Secret allegiance.",
        lore: "### Voting Procedure\nSimple majority.\n\n### Current Vote Estimate\nTwo support.\n\n### Council Members\n- **Ossian Thale** — Leaning.\n\n### Antagonist Influence\nNone.\n\n### Investigation Leads\nCheck the manifest.",
      }),
      resolved,
    );

    expect(fourSpaceIndentedLeaked).toBeNull();
  });

  it("keeps encounter participants, complication, and outcomes out of guest exports", () => {
    const encounter = {
      ...baseOutput,
      type: "event",
      kind: "encounter",
      status: "active",
      title: "Ambush at the Old Mill",
      summary: "A tense ambush unfolds at an abandoned mill.",
      content: "### What the Players See\nRain drums on the broken mill wheel.",
      lore: [
        "### At a Glance\n- **Type:** Combat",
        "### Situation & Stakes\nThe smugglers are protecting a stolen ledger.",
        "### Participants\n- **Canary Smuggler Captain**: wants the ledger out before dawn.",
        "### Environment\nSlick timber planks above a flooded sluice.",
        "### Possible Approaches\n- Jam the sluice gate to flood the lower floor.",
        "### Complication / Twist\nCanary Complication: lanterns ignite spilled lamp oil.",
        "### Outcomes & Consequences\n- **Success**: Canary Outcome: ledger recovered at a cost.\n- **Failure**: Smugglers escape.\n- **Avoidance**: Cargo moves.\n- **Escalation**: Reinforcements arrive.",
        "### Participants\n- Duplicate conflicting participant section.",
      ].join("\n\n"),
      labels: ["encounter", "encounter-generator", "imported-draft"],
    } satisfies GeneratorOutput;

    const layout = getGeneratorDocumentLayout(encounter);
    const payload = buildGeneratorSavePayload(encounter, layout);

    expect(payload.content).toContain("Rain drums on the broken mill wheel.");
    expect(payload.content).not.toContain("Canary Smuggler Captain");
    expect(payload.content).not.toContain("Canary Complication");
    expect(payload.content).not.toContain("Canary Outcome");
    expect(payload.lore).toContain("Canary Smuggler Captain");
    expect(payload.lore).not.toContain(
      "Duplicate conflicting participant section.",
    );
    expect(payload.lore).toContain("Canary Complication");
    expect(payload.lore).toContain("Canary Outcome");

    const entity = {
      id: "encounter-1",
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
      publishId: "encounter-export-test",
      vaultTitle: "Test Vault",
      publisherVersion: "test",
    });

    const serialized = JSON.stringify(bundle);
    expect(serialized).toContain("Rain drums on the broken mill wheel.");
    expect(serialized).not.toContain("Canary Smuggler Captain");
    expect(serialized).not.toContain("Canary Complication");
    expect(serialized).not.toContain("Canary Outcome");
  });

  it("keeps nation power blocs, rumours, entity seeds, and hidden problem out of guest exports", async () => {
    const { generateNationLocal } = await import("generator-engine");
    const nation = generateNationLocal(
      {
        genre: "Fantasy",
        polityType: "Republic",
        governmentStyle: "Merchant Oligarchy",
      },
      () => 0.25,
    ) as GeneratorOutput;
    const layout = getGeneratorDocumentLayout(nation);
    const payload = buildGeneratorSavePayload(nation, layout);

    expect(payload.type).toBe("faction");
    expect(payload.content).not.toContain("Power Blocs");
    expect(payload.content).not.toContain("Entity Seeds");
    expect(payload.lore).toContain("Power Blocs");
    expect(payload.lore).toContain("Rumours & Hooks");
    expect(payload.lore).toContain("Entity Seeds");
    const hiddenProblem = nation.lore.match(
      /- \*\*Hidden Problem\*\*: ([^\n]+)/,
    )?.[1];
    expect(hiddenProblem).toBeTruthy();
    expect(payload.content).not.toContain(hiddenProblem!);
    expect(payload.lore).toContain(hiddenProblem!);

    const entity = {
      id: "nation-1",
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
      publishId: "nation-export-test",
      vaultTitle: "Test Vault",
      publisherVersion: "test",
    });

    const serialized = JSON.stringify(bundle);
    expect(serialized).toContain(nation.title);
    expect(serialized).not.toContain("Power Blocs");
    expect(serialized).not.toContain("Rumours & Hooks");
    expect(serialized).not.toContain("Entity Seeds");
    expect(serialized).not.toContain(hiddenProblem!);
  });

  it("keeps dark-fantasy-faction NPCs, internal conflict, rival, and secret out of guest exports", async () => {
    const { generateDarkFactionLocal } = await import("generator-engine");
    const faction = generateDarkFactionLocal(
      {
        mode: "Plague-ridden lands",
        factionType: "Plague cult",
        scope: "A walled quarantine district",
        moralPosture: "Necessary evil",
      },
      () => 0.35,
    ) as GeneratorOutput;
    const layout = getGeneratorDocumentLayout(faction);
    const payload = buildGeneratorSavePayload(faction, layout);

    expect(payload.type).toBe("faction");
    expect(payload.content).not.toContain("Notable NPCs");
    expect(payload.content).not.toContain("Rival Faction");
    expect(payload.lore).toContain("Notable NPCs");
    expect(payload.lore).toContain("Internal Conflict");
    expect(payload.lore).toContain("Rival Faction");
    expect(payload.lore).toContain("Immediate Hook");

    const entity = {
      id: "dark-fantasy-faction-1",
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
      publishId: "dark-fantasy-faction-export-test",
      vaultTitle: "Test Vault",
      publisherVersion: "test",
    });

    const serialized = JSON.stringify(bundle);
    expect(serialized).toContain(faction.title);
    expect(serialized).not.toContain("Notable NPCs");
    expect(serialized).not.toContain("Rival Faction");
    expect(serialized).not.toContain("Immediate Hook");
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

it("keeps the faction's secret, hook and GM-facing prose private despite preview promotion and untrusted labels", async () => {
  const { generateFactionLocal } = await import("generator-engine");
  const draft = generateFactionLocal(
    {
      theme: "Classic Fantasy",
      type: "Merchant Guild",
      scope: "Single city",
      campaignContext: "An embargo on Grey Quay",
    },
    () => 0.35,
  ) as GeneratorOutput;
  const secret = draft.lore.match(/- \*\*Secret\*\*: ([^\n]+)/)?.[1];
  expect(secret).toBeTruthy();
  expect(draft.content).toContain(secret!);
  for (const output of [draft, { ...draft, labels: ["npc-generator"] }]) {
    const payload = buildGeneratorSavePayload(
      output,
      getGeneratorDocumentLayout(output),
      undefined,
      "faction",
    );
    expect(payload.type).toBe("faction");
    expect(payload.content).toContain("What they control");
    expect(payload.content).toContain("What they want");
    expect(payload.content).not.toContain(secret!);
    expect(payload.content).not.toContain("How to use them at the table");
    for (const value of [
      secret!,
      "Immediate Hook",
      "Internal Conflict",
      "Notable NPCs",
      "Rival Faction",
      "An embargo on Grey Quay",
      "Why they are dangerous",
      "How to use them at the table",
    ])
      expect(payload.lore).toContain(value);
  }
});

it("keeps nested and unrecognized faction headings in GM notes", async () => {
  const { generateFactionLocal } = await import("generator-engine");
  const draft = generateFactionLocal(
    { theme: "Classic Fantasy", type: "Merchant Guild", scope: "Single city" },
    () => 0.35,
  ) as GeneratorOutput;
  const malformedContents = [
    "### What they control\nPublic holdings.\n### What they want\nPublic plans.\n#### Secret\nNESTED_SECRET_MARKER",
    "### What they control\nPublic holdings.\n### What they want\nPublic plans.\n### Secret\nTOP_LEVEL_SECRET_MARKER",
  ];

  for (const content of malformedContents) {
    const output = { ...draft, content };
    const payload = buildGeneratorSavePayload(
      output,
      getGeneratorDocumentLayout(output),
      undefined,
      "faction",
    );

    expect(payload.content).toContain("Public holdings.");
    expect(payload.content).not.toMatch(/(?:NESTED|TOP_LEVEL)_SECRET_MARKER/);
    if (content.includes("NESTED")) {
      expect(payload.content).not.toContain("Public plans.");
      expect(payload.lore).toContain("Public plans.");
    } else {
      expect(payload.content).toContain("Public plans.");
    }
    expect(payload.lore).toContain(
      content.includes("NESTED")
        ? "NESTED_SECRET_MARKER"
        : "TOP_LEVEL_SECRET_MARKER",
    );
  }
});
