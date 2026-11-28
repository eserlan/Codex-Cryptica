import { describe, expect, it } from "vitest";
import {
  getGeneratorDocumentLayout,
  getGeneratorHandoffLayout,
} from "./generator-document-layout";
import { buildGeneratorSavePayload } from "./generator-save";
import { slugDrafts } from "./generator-page-drafts";

describe("urban faction and social hub source boundaries", () => {
  it.each([
    [
      "urban-fantasy-faction",
      "faction",
      [
        "Why they are dangerous",
        "Internal Conflict",
        "Secret",
        "Rival Faction",
      ],
    ],
    [
      "social-hub",
      "location",
      [
        "The Trouble",
        "How to use it at the table",
        "Hidden Problem",
        "Notable Regulars",
        "Rumours",
        "Entity Seeds",
      ],
    ],
  ] as const)(
    "keeps %s private details in source GM notes",
    (slug, type, headings) => {
      const output = slugDrafts[slug]!;
      const preview = getGeneratorDocumentLayout(output);
      const source = getGeneratorHandoffLayout(output, preview, slug);
      const saved = buildGeneratorSavePayload(output, preview, undefined, slug);
      expect(saved.type).toBe(type);
      for (const heading of headings) {
        expect(saved.content).not.toContain(heading);
        expect(saved.lore).toContain(heading);
        expect(source.lore).toContain(heading);
      }
      if (slug === "social-hub") {
        expect(saved.content).toContain("The Place");
        expect(saved.content).toContain("The People");
      } else {
        expect(saved.content).not.toContain("What they control");
        expect(saved.lore).toContain("What they control");
      }
    },
  );
});
