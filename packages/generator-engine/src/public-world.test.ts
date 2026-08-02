import { describe, expect, it } from "vitest";
import {
  buildWorldPrompt,
  generateWorldLocal,
  worldConfig,
} from "./public-world";

describe("World Generator", () => {
  it("creates a campaign-ready sci-fi world using the selected inputs", () => {
    const output = generateWorldLocal(
      {
        worldType: "Artificial World",
        habitability: "Habitable with technology",
        civilisation: "Ecumenopolis",
        genre: "Space Opera",
        dominantFeature: "A broken orbital ring that shades the equator",
      },
      () => 0,
    );

    expect(output.type).toBe("location");
    expect(output.title).toBeTruthy();
    expect(output.summary).toContain("artificial world");
    expect(output.labels).toEqual(
      expect.arrayContaining(["world", "Artificial World", "Ecumenopolis"]),
    );
    expect(output.content).toContain("## Climate & Geography");
    expect(output.content).toContain("## Settlements, Cultures & Factions");
    expect(output.lore).toContain("## Mysteries & Conflicts");
    expect(output.lore).toContain("## Adventure Hooks");
  });

  it("avoids a supplied world name when another local option is available", () => {
    const output = generateWorldLocal(
      { avoidNames: [worldConfig.names[0]] },
      () => 0,
    );

    expect(output.title).not.toBe(worldConfig.names[0]);
  });

  it("asks AI generation to develop the supplied star-system context", () => {
    const prompt = buildWorldPrompt({
      worldType: "Ocean World",
      habitability: "Earthlike",
      civilisation: "Frontier",
      genre: "Hard Sci-Fi",
      dominantFeature: "A migrating storm belt",
    });

    expect(prompt.userMessage).toContain("Star-system context");
    expect(prompt.userMessage).toContain("Climate & Geography");
    expect(prompt.userMessage).toContain("Adventure Hooks");
  });
});
