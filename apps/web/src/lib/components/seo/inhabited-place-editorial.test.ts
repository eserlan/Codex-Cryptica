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
    slug: "settlement" as const,
    type: "location",
    main: ["Core Concept", "First Impression"],
    gm: [
      "Current Tension",
      "Points of Interest",
      "Notable Inhabitants",
      "Adventure Hooks",
    ],
    secret: "bogus permit",
  },
  {
    slug: "tavern" as const,
    type: "location",
    main: ["The Place", "The People"],
    gm: [
      "The Trouble",
      "Hidden Problem",
      "Notable Patrons",
      "Rumours",
      "Entity Seeds",
    ],
    secret: "forged toll permits",
  },
  {
    slug: "kingdom" as const,
    type: "faction",
    main: ["The Realm", "Society & Culture"],
    gm: [
      "Government & Power",
      "Hidden Problem",
      "Major Factions",
      "Rumours & Hooks",
      "Entity Seeds",
    ],
    secret: "diverting maintenance funds",
  },
])("$slug editorial and vault contract", ({ slug, type, main, gm, secret }) => {
  it("retains the useful main overview and keeps source GM material separate", () => {
    const draft = slugDrafts[slug]!;
    const payload = buildGeneratorSavePayload(
      draft,
      getGeneratorDocumentLayout(draft),
      undefined,
      slug,
    );
    expect(payload.type).toBe(type);
    for (const heading of main) expect(payload.content).toContain(heading);
    for (const heading of gm) {
      expect(payload.content).not.toContain(heading);
      expect(payload.lore).toContain(heading);
    }
    expect(payload.content).not.toContain(secret);
    expect(payload.lore).toContain(secret);
    expect(SLUG_GUIDES[slug]?.links?.length).toBeGreaterThanOrEqual(2);
  });
  it("shows an eligible contextual CTA after explicit generation", () => {
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

  it("keeps a summary that repeats GM-only trouble in GM notes", () => {
    if (slug === "settlement") return;

    const draft = { ...slugDrafts[slug]!, summary: secret };
    const payload = buildGeneratorSavePayload(
      draft,
      getGeneratorDocumentLayout(draft),
      undefined,
      slug,
    );

    expect(payload.content).not.toContain(secret);
    expect(payload.lore).toContain(secret);
  });
});
