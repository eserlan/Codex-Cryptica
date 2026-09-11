import { describe, expect, it } from "vitest";
import {
  buildWorldPrompt,
  generateWorldLocal,
  getWorldTagProfile,
  parseWorldResponse,
  worldConfig,
} from "./public-world";

describe("World Generator", () => {
  it("creates a campaign-ready sci-fi world using the selected inputs", () => {
    const output = generateWorldLocal(
      {
        worldType: "Artificial World",
        habitability: "Habitable with technology",
        civilisation: "Ecumenopolis",
        societalModel: "Post-Scarcity Enclave",
        worldTagOne: "Trade Hub",
        worldTagTwo: "Terraform Failure",
        genre: "Space Opera",
        dominantFeature: "A broken orbital ring that shades the equator",
      },
      () => 0,
    );

    expect(output.type).toBe("location");
    expect(output.title).toBeTruthy();
    expect(output.summary).toContain("artificial world");
    expect(output.labels).toEqual(
      expect.arrayContaining([
        "world",
        "artificial-world",
        "habitable-with-technology",
        "ecumenopolis",
      ]),
    );
    expect(output.content).toContain("## Core Concept");
    expect(output.content).toContain("## How People Survive");
    expect(output.content).toContain("## Culture & Everyday Life");
    expect(output.content).toContain("post-scarcity enclave");
    expect(output.content).toContain("inhabited extent");
    expect(output.content).toContain("population");
    expect(output.content).toContain("Trade Hub");
    expect(output.content).toContain("Terraform Failure");
    expect(output.labels).toEqual(
      expect.arrayContaining(["trade-hub", "terraform-failure"]),
    );
    expect(output.lore).toContain("## Current Conflicts");
    expect(output.lore).toContain("## Mysteries");
    expect(output.lore).toContain("## Adventure Hooks");
  });

  it("avoids a supplied world name when another local option is available", () => {
    const output = generateWorldLocal(
      { avoidNames: [worldConfig.names[0]] },
      () => 0,
    );

    expect(output.title).not.toBe(worldConfig.names[0]);
  });

  it("provides adventure seed categories for every world tag", () => {
    for (const tag of worldConfig.worldTags) {
      const profile = getWorldTagProfile(tag);
      expect(profile.tag).toBe(tag);
      expect(profile.friends.length).toBeGreaterThanOrEqual(3);
      expect(profile.enemies.length).toBeGreaterThanOrEqual(3);
      expect(profile.complications.length).toBeGreaterThanOrEqual(3);
      expect(profile.things.length).toBeGreaterThanOrEqual(3);
      expect(profile.places.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("asks AI generation to develop the supplied star-system context", () => {
    const prompt = buildWorldPrompt({
      worldType: "Ocean World",
      habitability: "Earthlike",
      civilisation: "Frontier",
      societalModel: "Scientific Expedition",
      worldTagOne: "Pilgrimage Site",
      worldTagTwo: "Seismic Instability",
      genre: "Hard Sci-Fi",
      dominantFeature: "A migrating storm belt",
      avoidNames: ["Meridian 9"],
    });

    expect(prompt.userMessage).toContain("Star-system context");
    expect(prompt.userMessage).toContain("How People Survive");
    expect(prompt.userMessage).toContain("Adventure Hooks");
    expect(prompt.userMessage).toContain("Aethelgard");
    expect(prompt.userMessage).toContain("distinct information");
    expect(prompt.userMessage).toContain("scientific causality");
    expect(prompt.userMessage).toContain("daily life");
    expect(prompt.userMessage).toContain("internally complex");
    expect(prompt.userMessage).toContain("Scientific Expedition");
    expect(prompt.userMessage).toContain(
      "Stars Without Number world tags are: Pilgrimage Site and Seismic Instability",
    );
    expect(prompt.userMessage).toContain(
      "Treat the two selected Stars Without Number world tags as active creative constraints",
    );
    expect(prompt.userMessage).toContain("independent variable");
    expect(prompt.userMessage).toContain("abandoned extraction colonies");
    expect(prompt.userMessage).toContain("corporation-versus-nomad conflicts");
    expect(prompt.userMessage).toContain("internal validation");
    expect(prompt.userMessage).toContain("do not generate a second draft");
    expect(prompt.userMessage).toContain("defensible physics and engineering");
    expect(prompt.userMessage).toContain("explicit gravity control");
    expect(prompt.userMessage).toContain("gravity broadly matches");
    expect(prompt.userMessage).toContain(
      "breathable atmospheres contain oxygen",
    );
    expect(prompt.userMessage).toContain("accidentally described as zero-g");
    expect(prompt.userMessage).toContain("temperature and phase claims");
    expect(prompt.userMessage).toContain("communication delay");
    expect(prompt.userMessage).toContain("Every major institution");
    expect(prompt.userMessage).toContain("gameability over simulation");
    expect(prompt.userMessage).toContain("few strong, connected ideas");
    expect(prompt.userMessage).toContain(
      "Labels must match the actual generated content",
    );
    expect(prompt.userMessage).toContain("uninhabited world");
    expect(prompt.userMessage).toContain(
      "every square kilometre being fully urbanised",
    );
    expect(prompt.userMessage).toContain(
      "inhabited extent and population scale",
    );
    expect(prompt.userMessage).toContain("confusing mass with surface gravity");
    expect(prompt.userMessage).toContain("synthesised from nothing");
    expect(prompt.userMessage).toContain(
      "dominant feature shapes the civilisation",
    );
    expect(prompt.userMessage).toContain(
      "reasonable arguments on multiple sides",
    );
    expect(prompt.userMessage).toContain("Greek or Roman sea-related names");
    expect(prompt.userMessage).toContain("energy-unit currencies");
    expect(prompt.userMessage).toContain("mysterious repeating signals");
    expect(prompt.userMessage).toContain("retrieval missions");
    expect(prompt.userMessage).toContain("personal or lineage disputes");
    expect(prompt.userMessage).toContain("labels match its actual content");
    expect(prompt.userMessage).toContain("planning immediately");
    expect(prompt.userMessage).toContain("Vary the title form across outputs");
    expect(prompt.userMessage).toContain("especially 9");
    expect(prompt.userMessage).toContain("meaningful");
    expect(prompt.userMessage).toContain(
      "official survey or registry designation",
    );
    expect(prompt.userMessage).toContain("later local name");
    expect(prompt.userMessage).toContain("hyphenated survey codes");
    expect(prompt.userMessage).toContain(
      "Avoid reusing these numeric designations too: 9",
    );
    expect(prompt.userMessage).toContain("tethered habitats");
    expect(prompt.userMessage).toContain(
      "conservative maintainers versus mobile harvesters",
    );
    expect(prompt.userMessage).toContain("abandoned underwater facilities");
    expect(prompt.userMessage).toContain("Remove or revise labels");
    expect(prompt.userMessage).toContain("social consequences");
    expect(prompt.userMessage).toContain("scientific consistency check");
    expect(prompt.userMessage).toContain("causal consistency check");
    expect(prompt.userMessage).toContain("different underlying mechanisms");
    expect(prompt.userMessage).toContain(
      "Vary factions, mysteries, locations, and adventure hooks between generations",
    );
    expect(prompt.userMessage).toContain("Meridian 9");
  });

  it("calibrates technology guidance to the selected genre", () => {
    expect(
      buildWorldPrompt({ genre: "Grounded Sci-Fi" }).userMessage,
    ).toContain("some generous assumptions");
    expect(
      buildWorldPrompt({ genre: "Grounded Sci-Fi" }).userMessage,
    ).toContain("Avoid casual miracle technology");
    expect(
      buildWorldPrompt({ genre: "Advanced Sci-Fi" }).userMessage,
    ).toContain("gravity manipulation");
    expect(buildWorldPrompt({ genre: "Space Opera" }).userMessage).toContain(
      "highly speculative technology",
    );
  });

  it("includes campaign pressure guidance for every sci-fi genre", () => {
    const prompt = buildWorldPrompt({
      genre: "Hard Sci-Fi",
      campaignPressure: "Labour Rights and Working Conditions",
    });

    expect(prompt.userMessage).toContain("Campaign pressure:");
    expect(prompt.userMessage).toContain(
      "Labour Rights and Working Conditions",
    );
    expect(prompt.userMessage).toContain(
      "survival, settlement design, culture, economy",
    );
  });

  it("builds a Lancer brief from the selected world parameters", () => {
    const prompt = buildWorldPrompt({
      genre: "Lancer",
      lancerWorldFrame: "Long Rim Frontier",
      campaignPressure: "Colonial Ownership and Labour",
    });

    expect(prompt.userMessage).toContain("Lancer world parameters");
    expect(prompt.userMessage).toContain("Long Rim Frontier");
    expect(prompt.userMessage).toContain("Colonial Ownership and Labour");
    expect(prompt.userMessage).toContain(
      "military, political, and logistical institution",
    );
    expect(prompt.userMessage).toContain("civilian society");
  });

  it("makes local Lancer worlds reflect their selected campaign frame", () => {
    const output = generateWorldLocal({
      genre: "Lancer",
      lancerWorldFrame: "Long Rim Frontier",
      campaignPressure: "Colonial Ownership and Labour",
    });

    expect(output.content).toContain("Long Rim Frontier");
    expect(output.lore).toContain("Colonial Ownership and Labour");
  });

  it("parses an AI world response into a location draft", () => {
    const output = parseWorldResponse(
      JSON.stringify({
        title: "Meridian",
        summary: "A world split by a permanent storm belt.",
        lore: "## World Profile\nMeridian is a contested hard sci-fi colony world.",
        labels: ["world", "hard-sci-fi"],
      }),
    );

    expect(output.type).toBe("location");
    expect(output.content).toBe("");
    expect(output.lore).toContain("## World Profile");
    expect(output.labels).toEqual(["world", "hard-sci-fi"]);
  });

  it("rejects banned AI world titles", () => {
    expect(() =>
      parseWorldResponse(
        JSON.stringify({
          title: "Aethelgard",
          lore: "## World Profile\nA forbidden world.",
        }),
      ),
    ).toThrow("banned title");
  });

  it("rejects an AI title that reuses a numeric designation from the session", () => {
    expect(() =>
      parseWorldResponse(
        JSON.stringify({
          title: "Pelagos 9",
          lore: "## World Profile\nA world with a recurring designation.",
        }),
        ["Meridian 9"],
      ),
    ).toThrow("banned title");
  });

  it("always identifies AI output as a world for layout routing", () => {
    const output = parseWorldResponse(
      JSON.stringify({
        title: "Meridian",
        lore: "## World Profile\nA hard sci-fi storm-wrapped colony.",
        labels: ["hard-sci-fi"],
      }),
    );

    expect(output.labels).toEqual(["world", "hard-sci-fi"]);
  });

  it("drops labels that are not supported by the generated world text", () => {
    const output = parseWorldResponse(
      JSON.stringify({
        title: "Pelagos Survey K-4",
        summary: "An ocean world governed by seasonal migration treaties.",
        lore: "## World Profile\nPelagos Survey K-4 is an ocean world where seasonal migration treaties shape civic life.",
        labels: ["ocean-world", "ancient-machinery", "seasonal-migration"],
      }),
    );

    expect(output.labels).toEqual([
      "world",
      "ocean-world",
      "seasonal-migration",
    ]);
  });

  it("rejects malformed AI world responses instead of accepting an unusable draft", () => {
    expect(() => parseWorldResponse("not JSON")).toThrow();
  });
});
