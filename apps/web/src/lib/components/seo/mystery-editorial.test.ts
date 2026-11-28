import { describe, expect, it } from "vitest";
import { SLUG_GUIDES } from "./generator-page-guides";
import { slugDrafts } from "./generator-page-drafts";
import {
  getGeneratorContinuationConfig,
  shouldShowGeneratorContinuation,
} from "./generator-continuation";
import { getGeneratorDocumentLayout } from "./generator-document-layout";
import { buildGeneratorSavePayload } from "./generator-save";

describe("Mystery editorial and vault contract", () => {
  it("teaches actual controls and keeps a worked case's fixed truth private", () => {
    const guide = SLUG_GUIDES["mystery-investigation"]!;
    const copy = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Mystery type",
      "Scope",
      "Complexity / suspect count",
      "Clue density",
      "Danger / pressure",
      "Optional Campaign Context",
    ])
      expect(copy).toContain(label);
    expect(guide.links).toHaveLength(3);
    const draft = slugDrafts["mystery-investigation"]!;
    const payload = buildGeneratorSavePayload(
      draft,
      getGeneratorDocumentLayout(draft),
      undefined,
      "mystery-investigation",
    );
    expect(draft.status).toBe("draft");
    expect(payload.type).toBe("note");
    expect(payload.status).toBe("active");
    expect(payload.content).toContain("Evidence");
    expect(payload.content).not.toContain(
      "Branon has been diverting river tolls",
    );
    expect(payload.lore).toContain("Branon has been diverting river tolls");
    expect(payload.lore).toContain("Next NPC Moves");
  });

  it("shows a contextual continuation only after generating", () => {
    expect(
      getGeneratorContinuationConfig("mystery-investigation"),
    ).toMatchObject({ placement: "near-result", ctaLabel: "Add to my Codex" });
    const input = {
      generatorType: "mystery-investigation",
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
