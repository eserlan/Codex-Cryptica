import assert from "node:assert/strict";
import test from "node:test";
import { isMappedGeneratorChange } from "./generator-content-impact-match.mjs";

const enginePrefixes = [
  "packages/generator-engine/src/",
  "apps/web/src/lib/services/seo/",
  "apps/web/src/lib/components/seo/",
];

const pointCrawl = {
  id: "point-crawl",
  changed: /(?:^|\/)(?:public-point-crawl|.*point-crawl.*)\.[cm]?[jt]s$/,
};

test("maps Point Crawl changes in the shared specialized generator service", () => {
  assert.equal(
    isMappedGeneratorChange(
      pointCrawl,
      "apps/web/src/lib/services/seo/generator-engine-specialized.ts",
      enginePrefixes,
    ),
    true,
  );
});

test("does not map unrelated SEO service files to Point Crawl", () => {
  assert.equal(
    isMappedGeneratorChange(
      pointCrawl,
      "apps/web/src/lib/services/seo/generator-engine.ts",
      enginePrefixes,
    ),
    false,
  );
});

test("keeps the existing generator-name filename mapping", () => {
  assert.equal(
    isMappedGeneratorChange(
      pointCrawl,
      "packages/generator-engine/src/point-crawl.ts",
      enginePrefixes,
    ),
    true,
  );
});
