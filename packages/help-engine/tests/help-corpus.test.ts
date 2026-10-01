import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateHelpCorpus } from "../src/bundle/front-matter";
import { FEATURE_REGISTRY } from "../src/registry";
import { validateRegistry } from "../src/registry/schema";
import { buildRealBundle, HELP_DIR } from "./eval/evaluate";

function realHelpSources() {
  return readdirSync(HELP_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => ({
      source: file,
      raw: readFileSync(join(HELP_DIR, file), "utf8"),
    }));
}

describe("real Help corpus contract", () => {
  it("has complete, unique metadata for every visible article", () => {
    const errors = validateHelpCorpus(realHelpSources());
    expect(errors, errors.join("\n")).toEqual([]);
  });

  it("keeps every feature-registry Help reference valid", () => {
    const bundle = buildRealBundle();
    const errors = validateRegistry(FEATURE_REGISTRY, {
      helpIds: new Set(bundle.helpIds),
    });
    expect(errors, errors.join("\n")).toEqual([]);
  });
});
