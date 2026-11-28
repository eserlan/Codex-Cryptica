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
    slug: "dark-fantasy-faction" as const,
    main: ["What they control", "What they want"],
    privateHeadings: [
      "Why they are dangerous",
      "How to use them at the table",
      "Internal Conflict",
      "Notable NPCs",
      "Rival Faction",
    ],
    secret: "The Order's captain detains healthy relatives to fund supplies.",
    summaryDisclosure: "at a price its own healers can no longer accept",
  },
  {
    slug: "vampire-clan" as const,
    main: ["Overview", "Public Facade"],
    privateHeadings: [
      "Table Use",
      "GM Reference Information",
      "Dark Agenda",
      "Internal Conflict",
      "Notable NPCs",
      "Rival Faction",
      "Adventure Hook",
    ],
    secret: "Secure control of the hospital trust",
    summaryDisclosure: "bitter dispute over feeding and consent",
  },
])(
  "$slug editorial and vault contract",
  ({ slug, main, privateHeadings, secret, summaryDisclosure }) => {
    it("keeps the source GM reference and GM-only body sections out of vault main text", () => {
      const draft = slugDrafts[slug]!;
      const payload = buildGeneratorSavePayload(
        draft,
        getGeneratorDocumentLayout(draft),
        undefined,
        slug,
      );
      expect(payload.type).toBe("faction");
      for (const heading of main) expect(payload.content).toContain(heading);
      for (const heading of privateHeadings) {
        expect(payload.content).not.toContain(heading);
        expect(payload.lore).toContain(heading);
      }
      expect(payload.content).not.toContain(secret);
      expect(payload.lore).toContain(secret);
      expect(draft.summary).not.toContain(summaryDisclosure);
      expect(payload.content).not.toContain(summaryDisclosure);
      expect(SLUG_GUIDES[slug]?.links).toHaveLength(3);
    });
    it("shows a contextual CTA after successful explicit generation", () => {
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

it("preserves an unheaded vampire overview while keeping source lore private", () => {
  const sample = slugDrafts["vampire-clan"]!;
  const draft = {
    ...sample,
    content: "The clan maintains a public salon.",
    lore: "### Dark Agenda\nTake the hospital trust.",
  };
  const payload = buildGeneratorSavePayload(
    draft,
    getGeneratorDocumentLayout(draft),
    undefined,
    "vampire-clan",
  );
  expect(payload.content).toContain(draft.content);
  expect(payload.content).not.toContain("Take the hospital trust");
  expect(payload.lore).toContain("Take the hospital trust");
});

it("keeps equivalent vampire overview headings in main text", () => {
  const sample = slugDrafts["vampire-clan"]!;
  const draft = {
    ...sample,
    content:
      "### History\nThe clan has shaped the city for generations.\n\n### Public Role\nIts salons connect artists, physicians and patrons.",
    lore: "### Dark Agenda\nTake the hospital trust.",
  };
  const payload = buildGeneratorSavePayload(
    draft,
    getGeneratorDocumentLayout(draft),
    undefined,
    "vampire-clan",
  );
  expect(payload.content).toContain("### History");
  expect(payload.content).toContain("### Public Role");
  expect(payload.lore).toContain("Take the hospital trust");
  expect(payload.content).not.toContain("Take the hospital trust");
});
