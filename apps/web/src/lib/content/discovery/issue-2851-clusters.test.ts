import { describe, expect, it } from "vitest";
import { getAnswer } from "../answers/registry";
import { getExample } from "../examples/registry";
import { slugMeta } from "../../components/seo/generator-page-meta";
import { findIntentOwner, getEntryById, getEntryByPath } from "./registry";

describe("issue #2851 discovery clusters", () => {
  it("keeps one owner for the rumour generator, answer, and example intents", () => {
    expect(findIntentOwner("rpg rumor generator")?.id).toBe("generator-rumour");
    expect(findIntentOwner("how do I generate useful RPG rumours")?.id).toBe(
      "answer-useful-rpg-rumours",
    );
    expect(findIntentOwner("rpg rumour table example")?.id).toBe(
      "example-lowmere-rumour-table",
    );
    expect(
      findIntentOwner("how do you create a believable fictional religion")?.id,
    ).toBe("answer-fictional-religion");
  });

  it("links the rumour cluster in both directions", () => {
    const answer = getAnswer("how-do-you-generate-useful-rpg-rumours");
    const example = getExample("lowmere-six-words-rumour-table");
    const generator = slugMeta.rumour;

    expect(
      answer?.relatedTools.some((link) => link.href === "/generators/rumour"),
    ).toBe(true);
    expect(
      answer?.sections.some(
        (section) =>
          section.kind === "prose" &&
          section.cta?.href === "/examples/lowmere-six-words-rumour-table",
      ),
    ).toBe(true);
    expect(
      example?.relatedAnswers.some(
        (link) =>
          link.href === "/answers/how-do-you-generate-useful-rpg-rumours",
      ),
    ).toBe(true);
    expect(
      example?.relatedGenerators.some(
        (link) => link.href === "/generators/rumour",
      ),
    ).toBe(true);
    expect(generator.relatedLinks?.map((link) => link.href)).toEqual(
      expect.arrayContaining([
        "/answers/how-do-you-generate-useful-rpg-rumours",
        "/examples/lowmere-six-words-rumour-table",
      ]),
    );
  });

  it("registers the canonical routes used by the cluster", () => {
    expect(
      getEntryByPath("/answers/how-do-you-generate-useful-rpg-rumours")?.id,
    ).toBe("answer-useful-rpg-rumours");
    expect(getEntryByPath("/examples/lowmere-six-words-rumour-table")?.id).toBe(
      "example-lowmere-rumour-table",
    );
    expect(getEntryById("generator-rumour")?.canonicalPath).toBe(
      "/generators/rumour",
    );
  });

  it("keeps fictional religion guidance grounded without inventing a religion generator", () => {
    const religion = getAnswer(
      "how-do-you-create-a-believable-fictional-religion",
    );
    const body = JSON.stringify(religion);

    expect(body).toMatch(/place and class/i);
    expect(body).toMatch(/reform/i);
    expect(religion?.relatedTools.map((tool) => tool.href)).not.toContain(
      "/generators/religion",
    );
  });
});
