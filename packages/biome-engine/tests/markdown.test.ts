import { describe, expect, it } from "bun:test";
import {
  addAlteration,
  createBlankProfile,
  createProfileFromReference,
  setOwnClimate,
  setOwnField,
} from "../src/profile";
import {
  renderProfileMarkdown,
  renderReferenceMarkdown,
} from "../src/markdown";
import { getBiome } from "../src/catalogue";

const tundra = getBiome("tundra")!;

function headings(markdown: string): string[] {
  return markdown
    .split("\n")
    .filter((line) => /^#{1,2} /.test(line))
    .map((line) => line.replace(/^#+ /, ""));
}

function section(markdown: string, heading: string): string {
  const start = markdown.indexOf(`## ${heading}\n`);
  if (start === -1) return "";
  const rest = markdown.slice(start + heading.length + 4);
  const next = rest.search(/\n## /);
  return next === -1 ? rest : rest.slice(0, next);
}

describe("renderProfileMarkdown", () => {
  it("writes the title, then Reference, My changes and Sources, in that order", () => {
    let profile = createProfileFromReference(tundra, 1);
    profile = setOwnField(profile, "vegetation", "Glowing moss");
    const md = renderProfileMarkdown("Ashen Flats", profile);
    expect(headings(md)).toEqual([
      "Ashen Flats",
      "Reference",
      "My changes",
      "Sources",
    ]);
  });

  it("keeps reference text out of My changes and the user's text out of Reference", () => {
    let profile = createProfileFromReference(tundra, 1);
    profile = setOwnField(profile, "vegetation", "Glowing moss");
    const md = renderProfileMarkdown("Ashen Flats", profile);
    expect(section(md, "Reference")).toContain(tundra.landscape[0].text);
    expect(section(md, "Reference")).not.toContain("Glowing moss");
    expect(section(md, "My changes")).toContain("Glowing moss");
    expect(section(md, "My changes")).not.toContain(tundra.landscape[0].text);
  });

  it("shows climate ranges in the reference and in my changes", () => {
    let profile = createProfileFromReference(tundra, 1);
    profile = setOwnClimate(profile, {
      temperature: { low: 5, high: 15, unit: "°C" },
    });
    const md = renderProfileMarkdown("Warm Flats", profile);
    expect(section(md, "Reference")).toContain("-20 to 0 °C");
    expect(section(md, "My changes")).toContain("5 to 15 °C");
  });

  it("omits Reference and Sources for a blank-start profile", () => {
    let profile = createBlankProfile();
    profile = setOwnField(profile, "terrain", "Floating islands");
    expect(headings(renderProfileMarkdown("Sky Reach", profile))).toEqual([
      "Sky Reach",
      "My changes",
    ]);
  });

  it("omits My changes when nothing has been changed", () => {
    const md = renderProfileMarkdown(
      "Plain",
      createProfileFromReference(tundra, 1),
    );
    expect(headings(md)).not.toContain("My changes");
  });

  it("writes only the title for an empty blank profile", () => {
    expect(renderProfileMarkdown("Empty", createBlankProfile()).trim()).toBe(
      "# Empty",
    );
  });

  it("lists the snapshot's sources", () => {
    const md = renderProfileMarkdown(
      "X",
      createProfileFromReference(tundra, 1),
    );
    expect(section(md, "Sources")).toContain("Köppen-Geiger");
  });

  it("is deterministic", () => {
    const profile = setOwnField(
      createProfileFromReference(tundra, 1),
      "water",
      "Pools",
    );
    expect(renderProfileMarkdown("X", profile)).toBe(
      renderProfileMarkdown("X", profile),
    );
  });

  it("uses the snapshot, so it still renders if the reference is no longer in the catalogue", () => {
    const profile = createProfileFromReference(tundra, 1);
    profile.reference = { ...profile.reference!, biomeId: "removed-biome" };
    const md = renderProfileMarkdown("Old", profile);
    expect(section(md, "Reference")).toContain(tundra.landscape[0].text);
  });
});

describe("renderReferenceMarkdown", () => {
  it("writes a library biome with its sections and sources", () => {
    const md = renderReferenceMarkdown(tundra);
    expect(md.startsWith("# Tundra\n")).toBe(true);
    expect(md).toContain(tundra.summary);
    expect(headings(md)).toContain("Sources");
    expect(md).toContain(tundra.hazards[0].text);
  });
});

describe("renderProfileMarkdown fictional alterations", () => {
  function withAlteration() {
    let profile = createProfileFromReference(tundra, 1);
    profile = setOwnField(profile, "vegetation", "Glowing moss");
    return addAlteration(
      profile,
      {
        aspect: "climate",
        description: "It rains ash",
        cause: "A sleeping volcano",
        effects: ["Grey rivers", "Hardy ferns"],
      },
      "a1",
    );
  }

  it("writes alterations under their own heading, after My changes and before Sources", () => {
    const md = renderProfileMarkdown("Ashen Flats", withAlteration());
    expect(headings(md)).toEqual([
      "Ashen Flats",
      "Reference",
      "My changes",
      "Fictional alterations",
      "Sources",
    ]);
  });

  it("lists description, cause and effects", () => {
    const text = section(
      renderProfileMarkdown("X", withAlteration()),
      "Fictional alterations",
    );
    expect(text).toContain("It rains ash");
    expect(text).toContain("Cause: A sleeping volcano");
    expect(text).toContain("Grey rivers");
    expect(text).toContain("Hardy ferns");
  });

  it("never puts alterations under Reference or My changes", () => {
    const md = renderProfileMarkdown("X", withAlteration());
    expect(section(md, "Reference")).not.toContain("It rains ash");
    expect(section(md, "My changes")).not.toContain("It rains ash");
  });

  it("says plainly when an alteration has no cause yet", () => {
    const profile = addAlteration(
      createBlankProfile(),
      { aspect: "water", description: "Black rivers" },
      "a1",
    );
    const text = section(
      renderProfileMarkdown("X", profile),
      "Fictional alterations",
    );
    expect(text).toContain("Cause: not written yet");
  });

  it("omits the heading when there are no alterations", () => {
    expect(
      headings(
        renderProfileMarkdown("X", createProfileFromReference(tundra, 1)),
      ),
    ).not.toContain("Fictional alterations");
  });
});

describe("renderProfileMarkdown illustration prompt and links", () => {
  it("adds an Illustration prompt section before Sources when one is stored", () => {
    const profile = {
      ...createProfileFromReference(tundra, 1),
      illustrationPrompt: "fantasy, illustration of Tundra",
    };
    const md = renderProfileMarkdown("X", profile);
    expect(headings(md)).toEqual([
      "X",
      "Reference",
      "Illustration prompt",
      "Sources",
    ]);
    expect(section(md, "Illustration prompt")).toContain(
      "fantasy, illustration of Tundra",
    );
  });

  it("lists the user's reference links under their own heading", () => {
    const profile = {
      ...createBlankProfile(),
      referenceLinks: [{ url: "https://example.com/a", label: "My research" }],
    };
    const md = renderProfileMarkdown("X", profile);
    expect(headings(md)).toEqual(["X", "Reference links"]);
    expect(section(md, "Reference links")).toContain(
      "[My research](https://example.com/a)",
    );
  });
});
