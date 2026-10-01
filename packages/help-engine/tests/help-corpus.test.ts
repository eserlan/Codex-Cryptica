import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  validateHelpArticleFrontMatter,
  validateHelpCorpus,
} from "../src/bundle/front-matter";
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

function article(frontMatter: string, body = "# Help") {
  return `---\n${frontMatter}\n---\n\n${body}\n`;
}

describe("Help front matter validator", () => {
  it("accepts valid YAML including multiline tags", () => {
    const raw = article(`id: graph-basics\ntitle: Graph basics\ndescription: Learn the graph view.\ntags:\n  - graph\n  - navigation\nrank: 2`);

    expect(validateHelpArticleFrontMatter(raw)).toEqual([]);
  });

  it("requires visible metadata and a valid rank", () => {
    const raw = article(`id: Bad ID\ntitle: \"\"\ntags: []\nrank: -1`);

    expect(validateHelpArticleFrontMatter(raw)).toEqual([
      "`id` must be stable kebab-case",
      "missing required string `title`",
      "missing required string `description`",
      "missing non-empty string `tags` array",
      "`rank` must be a non-negative integer when present",
    ]);
  });

  it("treats only boolean true as hidden", () => {
    const actuallyHidden = article(`id: internal-note\nhidden: true`);
    const quotedTrue = article(`id: visible-note\nhidden: \"true\"\ntitle: Visible note`);

    expect(validateHelpArticleFrontMatter(actuallyHidden)).toEqual([]);
    expect(validateHelpArticleFrontMatter(quotedTrue)).toEqual([
      "missing required string `description`",
      "missing non-empty string `tags` array",
    ]);
  });

  it("rejects malformed YAML", () => {
    const raw = article(`id: broken\ntitle: [unterminated`);

    expect(validateHelpArticleFrontMatter(raw)).toEqual([
      "malformed YAML front matter",
    ]);
  });

  it("rejects incorrectly typed tags and rank", () => {
    const raw = article(`id: typed-fields\ntitle: Typed fields\ndescription: Typed validation example.\ntags: graph\nrank: \"3\"`);

    expect(validateHelpArticleFrontMatter(raw)).toEqual([
      "missing non-empty string `tags` array",
      "`rank` must be a non-negative integer when present",
    ]);
  });

  it("detects duplicate IDs across hidden and visible documents", () => {
    const errors = validateHelpCorpus([
      {
        source: "hidden.md",
        raw: article(`id: shared-id\nhidden: true`),
      },
      {
        source: "visible.md",
        raw: article(`id: shared-id\ntitle: Visible\ndescription: Visible help.\ntags: [help]`),
      },
    ]);

    expect(errors).toEqual([
      'visible.md: duplicate id "shared-id" (also in hidden.md)',
    ]);
  });
});

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
