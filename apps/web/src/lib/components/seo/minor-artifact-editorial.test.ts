import { describe, expect, it } from "vitest";
import { SLUG_GUIDES } from "./generator-page-guides";
import { slugDrafts } from "./generator-page-drafts";
import {
  getGeneratorContinuationConfig,
  shouldShowGeneratorContinuation,
} from "./generator-continuation";
import { getGeneratorDocumentLayout } from "./generator-document-layout";
import { buildGeneratorSavePayload } from "./generator-save";

describe.each([
  {
    slug: "minor-magic-item" as const,
    fields: [
      "Focus / Primary Utility",
      "Usage Limit / Charges",
      "Activation Method",
      "Item Form",
      "Quirk or Side Effect",
    ],
    privateHeadings: [
      "Magical Effect & Mechanics",
      "Quirk or Drawback",
      "Provenance & Rumour",
    ],
  },
  {
    slug: "artifact-generator" as const,
    fields: ["Power Tier / Scope", "Current Status", "Curse / Cost / Drawback"],
    privateHeadings: [
      "Artifact Powers & Manifestations",
      "Cost, Curse, Corruption, or Taboo",
      "Interested Factions & Pursuers",
      "Rumours & Conflicting Legends",
      "Destruction or Sealing Conditions",
    ],
  },
])(
  "$slug editorial and vault contract",
  ({ slug, fields, privateHeadings }) => {
    it("teaches real controls and preserves source GM reference regardless of reading layout", () => {
      const guide = SLUG_GUIDES[slug]!;
      for (const field of fields)
        expect(guide.tips.map((t) => t.detail).join(" ")).toContain(field);
      expect(guide.links).toHaveLength(2);
      const draft = slugDrafts[slug]!;
      const payload = buildGeneratorSavePayload(
        draft,
        getGeneratorDocumentLayout(draft),
        undefined,
        slug,
      );
      expect(payload.type).toBe("item");
      expect(payload.lore).toBe(draft.lore);
      expect(payload.content).toContain("Description");
      for (const heading of privateHeadings) {
        expect(payload.content).not.toContain(heading);
        expect(payload.lore).toContain(heading);
      }
    });
    it("shows a contextual CTA only for explicit generation", () => {
      expect(getGeneratorContinuationConfig(slug)).toMatchObject({
        placement: "near-result",
        ctaLabel: "Add to my Codex",
      });
      const input = {
        generatorType: slug,
        userGenerationSucceeded: true,
        isExampleDraft: false,
        isBusy: false,
        variant: "default" as const,
      };
      expect(shouldShowGeneratorContinuation(input)).toBe(true);
      expect(
        shouldShowGeneratorContinuation({ ...input, isExampleDraft: true }),
      ).toBe(false);
      expect(shouldShowGeneratorContinuation({ ...input, isBusy: true })).toBe(
        false,
      );
    });
  },
);
