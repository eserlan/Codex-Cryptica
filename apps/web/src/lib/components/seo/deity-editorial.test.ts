import { describe, expect, it } from "vitest";
import { SLUG_GUIDES } from "./generator-page-guides";
import { slugDrafts } from "./generator-page-drafts";
import {
  getGeneratorContinuationConfig,
  shouldShowGeneratorContinuation,
} from "./generator-continuation";
import { getGeneratorDocumentLayout } from "./generator-document-layout";
import { buildGeneratorSavePayload } from "./generator-save";

describe("God and deity editorial and vault contract", () => {
  it("teaches actual controls and preserves the single deity source GM reference on both routes", () => {
    const guide = SLUG_GUIDES["god-generator"]!;
    for (const label of [
      "Generate target",
      "Divine Type",
      "Primary Domain",
      "Worshippers",
      "Tone",
      "Campaign context (optional)",
    ])
      expect(guide.tips.map((t) => t.detail).join(" ")).toContain(label);
    expect(guide.links).toHaveLength(3);
    const draft = slugDrafts["god-generator"]!;
    for (const slug of ["god-generator", "pantheon-generator"]) {
      const payload = buildGeneratorSavePayload(
        draft,
        getGeneratorDocumentLayout(draft),
        undefined,
        slug,
      );
      expect(payload.type).toBe("character");
      expect(payload.content).toContain("Worship & Cults");
      expect(payload.content).not.toContain("Secret");
      expect(payload.content).not.toContain("Adventure Hooks");
      expect(payload.lore).toBe(draft.lore);
    }
  });
  it("keeps the alternate pantheon output as a Faction and its hidden problem private", () => {
    const draft = slugDrafts["pantheon-generator"]!;
    const payload = buildGeneratorSavePayload(
      draft,
      getGeneratorDocumentLayout(draft),
      undefined,
      "god-generator",
    );
    expect(payload.type).toBe("faction");
    expect(payload.content).not.toContain("Hidden Problem");
    expect(payload.lore).toContain("Hidden Problem");
  });
  it.each(["god-generator", "pantheon-generator"])(
    "refuses to save a sparse single-deity result on %s while its public sections remain in GM lore",
    (slug) => {
      const draft = slugDrafts["god-generator"]!;
      const sparseDraft = {
        ...draft,
        content: "",
        lore: `${draft.content}\n\n${draft.lore}`,
      };

      expect(() =>
        buildGeneratorSavePayload(
          sparseDraft,
          getGeneratorDocumentLayout(sparseDraft),
          undefined,
          slug,
        ),
      ).toThrow("missing required public sections");
    },
  );
  it("shows a contextual continuation only after explicit generation", () => {
    expect(getGeneratorContinuationConfig("god-generator")).toMatchObject({
      placement: "near-result",
      ctaLabel: "Add to my Codex",
    });
    const input = {
      generatorType: "god-generator",
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
});
