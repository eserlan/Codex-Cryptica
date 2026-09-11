import { describe, it, expect } from "vitest";
import {
  buildEntityVoicePrompt,
  buildScholarVoicePrompt,
} from "./prompt-builders";
import type { SoundBiteRequest } from "schema";

describe("buildEntityVoicePrompt", () => {
  it("builds prompt with entity title, type, labels, and lore", () => {
    const request: SoundBiteRequest = {
      entity: {
        id: "ent-1",
        title: "Kaelen the Blacksmith",
        type: "character",
        labels: ["npc", "merchant"],
        aliases: [],
        connections: [],
        content: "A sturdy dwarven smith who forged kings' blades.",
        lore: "Rumored to know secret fire-working arts.",
        status: "active",
      },
      voiceMode: "entity",
      vaultEntitySummaries: [],
    };

    const prompt = buildEntityVoicePrompt(request);

    expect(prompt).toContain("Name: Kaelen the Blacksmith");
    expect(prompt).toContain("Type: character");
    expect(prompt).toContain("Labels: npc, merchant");
    expect(prompt).toContain(
      "A sturdy dwarven smith who forged kings' blades.",
    );
    expect(prompt).toContain("Rumored to know secret fire-working arts.");
    expect(prompt).toContain("AUDIO DELIVERY TAGS");
  });

  it("handles missing description with fallback text and none for labels", () => {
    const request: SoundBiteRequest = {
      entity: {
        id: "ent-2",
        title: "The Nameless Blade",
        type: "item",
        labels: [],
        aliases: [],
        connections: [],
        content: "",
        status: "active",
      },
      voiceMode: "entity",
      vaultEntitySummaries: [],
    };

    const prompt = buildEntityVoicePrompt(request);

    expect(prompt).toContain("Name: The Nameless Blade");
    expect(prompt).toContain("Labels: none");
    expect(prompt).toContain(
      "No description provided — use the entity name and type to invent something fitting.",
    );
  });

  it("truncates lore longer than 2000 characters with ellipsis", () => {
    const longLore = "A".repeat(2500);
    const request: SoundBiteRequest = {
      entity: {
        id: "ent-3",
        title: "Ancient Tome",
        type: "item",
        labels: [],
        aliases: [],
        connections: [],
        content: longLore,
        status: "active",
      },
      voiceMode: "entity",
      vaultEntitySummaries: [],
    };

    const prompt = buildEntityVoicePrompt(request);

    expect(prompt).toContain("A".repeat(2000) + "…");
    expect(prompt).not.toContain("A".repeat(2001));
  });
});

describe("buildScholarVoicePrompt", () => {
  it("builds scholar prompt including potential scholar summaries from vault", () => {
    const request: SoundBiteRequest = {
      entity: {
        id: "ent-1",
        title: "The Sunken Citadel",
        type: "location",
        labels: ["ruins"],
        aliases: [],
        connections: [],
        content: "A fortress submerged below the misty marshes.",
        status: "active",
      },
      voiceMode: "scholar",
      vaultEntitySummaries: [
        {
          title: "Archivist Morwen",
          type: "character",
          summary: "Chronicler of the Sunken Epoch.",
        },
        {
          title: "Professor Lind",
          type: "character",
          summary: "Cartographer of wetlands.",
        },
      ],
    };

    const prompt = buildScholarVoicePrompt(request);

    expect(prompt).toContain("SUBJECT ENTITY:\nName: The Sunken Citadel");
    expect(prompt).toContain("KNOWN VAULT ENTITIES (potential scholars):");
    expect(prompt).toContain(
      "- Archivist Morwen (character): Chronicler of the Sunken Epoch.",
    );
    expect(prompt).toContain(
      "- Professor Lind (character): Cartographer of wetlands.",
    );
    expect(prompt).toContain('"scholarAttribution"');
  });

  it("omits KNOWN VAULT ENTITIES section when vaultEntitySummaries is empty", () => {
    const request: SoundBiteRequest = {
      entity: {
        id: "ent-1",
        title: "Lonely Island",
        type: "location",
        labels: [],
        aliases: [],
        connections: [],
        content: "",
        status: "active",
      },
      voiceMode: "scholar",
      vaultEntitySummaries: [],
    };

    const prompt = buildScholarVoicePrompt(request);

    expect(prompt).not.toContain("KNOWN VAULT ENTITIES");
  });
});
