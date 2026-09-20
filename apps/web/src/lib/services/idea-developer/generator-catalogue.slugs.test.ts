import { describe, expect, it } from "vitest";
import { DEFAULT_GENERATOR_KEYS, GENERATOR_CATALOGUE } from "generator-engine";
import { GENERATOR_SLUGS } from "../../../params/generator_slug";

/**
 * SC-014: every generator link the tool can show points at a route that
 * exists. It lives in `apps/web` because the package must not import from the
 * app.
 */
describe("generator catalogue against the real routes", () => {
  it.each(GENERATOR_CATALOGUE.map((g) => [g.slug]))(
    "%s is a generator route that exists",
    (slug) => {
      expect(GENERATOR_SLUGS as readonly string[]).toContain(slug);
    },
  );

  it("offers a default set made only of routes that exist", () => {
    for (const key of DEFAULT_GENERATOR_KEYS) {
      const entry = GENERATOR_CATALOGUE.find((g) => g.key === key);
      expect(entry).toBeDefined();
      expect(GENERATOR_SLUGS as readonly string[]).toContain(entry!.slug);
    }
  });
});
