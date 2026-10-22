import { describe, expect, it } from "bun:test";
import { BIOME_CATALOGUE } from "../src/catalogue";
import { PENDING } from "../src/catalogue/helpers";

/**
 * Release gate. These checks need content that only exists once the team has
 * generated and reviewed the images, so they run only when
 * `BIOME_RELEASE_GATE=1` (see tasks T035f and T101). Without it the suite is
 * skipped so ordinary development is not blocked.
 */
const gate = process.env.BIOME_RELEASE_GATE === "1" ? describe : describe.skip;

gate("catalogue release gate", () => {
  for (const biome of BIOME_CATALOGUE) {
    it(`${biome.id}: first image is a generated, finished and reviewed illustration`, () => {
      const first = biome.images[0];
      expect(first.origin).toBe("generated");
      if (first.origin !== "generated") return;
      expect(first.tool).not.toBe(PENDING);
      expect(first.generatedAt).not.toBe(PENDING);
      expect(first.review, "missing human review").toBeDefined();
      expect(first.review?.notes).not.toBe(PENDING);
    });
  }
});
