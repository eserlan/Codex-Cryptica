import { describe, expect, it } from "vitest";
import { SLUG_GUIDES } from "./generator-page-guides";
import { slugDrafts } from "./generator-page-drafts";
import {
  getGeneratorContinuationConfig,
  shouldShowGeneratorContinuation,
} from "./generator-continuation";
import { getGeneratorDocumentLayout } from "./generator-document-layout";
import { buildGeneratorSavePayload } from "./generator-save";
import { slugMeta } from "./generator-page-meta";

describe("Creature editorial and vault contract", () => {
  it("teaches real controls, progresses from encounter motivation to balancing and shows a coherent creature", () => {
    const guide = SLUG_GUIDES.creature!;
    const text = guide.tips.map((tip) => tip.detail).join(" ");
    for (const label of [
      "Ecological Role / Behaviour",
      "Habitat / Environment",
      "Threat Level",
      "Intelligence / Temperament",
    ])
      expect(text).toContain(label);
    expect(guide.links?.map((link) => link.href)).toEqual([
      "/answers/what-makes-a-good-random-encounter",
      "/answers/how-do-i-balance-rpg-combat-encounters-without-a-tpk",
    ]);
    const draft = slugDrafts.creature!;
    const payload = buildGeneratorSavePayload(
      draft,
      getGeneratorDocumentLayout(draft),
      undefined,
      "creature",
    );
    expect(payload.type).toBe("creature");
    expect(payload.content).toContain("Field Signs");
    expect(payload.content).not.toContain("Secret Weaknesses");
    expect(payload.lore).toContain("Secret Weaknesses");
    expect(payload.lore).toContain("Truth Behind Rumours");
  });

  it("shows only one contextual continuation after a successful explicit generation", () => {
    const continuation = getGeneratorContinuationConfig("creature");
    expect(continuation).toMatchObject({
      placement: "near-result",
      ctaLabel: "Add to my Codex",
    });
    expect(continuation?.capabilities.join(" ")).toContain(
      "AI is asked to keep hidden ecology",
    );
    expect(continuation?.capabilities.join(" ")).toContain(
      "review AI text before sharing",
    );
    expect(slugMeta.creature?.faqs?.[4]?.answer).toContain(
      "The AI is asked to put known characteristics",
    );
    expect(slugMeta.creature?.faqs?.[4]?.answer).toContain(
      "review AI-written text before sharing it",
    );
    const input = {
      generatorType: "creature",
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
