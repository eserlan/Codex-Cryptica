import { describe, expect, it } from "vitest";
import {
  validateHelpArticleFrontMatter,
  validateHelpCorpus,
} from "../src/bundle/front-matter";

describe("Help article front matter", () => {
  it("accepts tags written as a multiline YAML flow array", () => {
    const article = `---
id: generators
title: Campaign Generators
description: Draft useful campaign content with guided generators.
tags:
  [
    generator,
    create,
    entities,
  ]
---
Article body.
`;

    expect(validateHelpArticleFrontMatter(article)).toEqual([]);
  });

  it("requires a description and at least one tag for visible articles", () => {
    const article = `---
id: graph-basics
title: Knowledge Graph
tags: []
---
Article body.
`;

    expect(validateHelpArticleFrontMatter(article)).toEqual([
      "missing required `description`",
      "missing non-empty `tags` array",
    ]);
  });

  it("ignores metadata requirements for hidden articles", () => {
    const article = `---
hidden: true
---
Article body.
`;

    expect(validateHelpArticleFrontMatter(article)).toEqual([]);
    expect(validateHelpCorpus([{ source: "hidden.md", raw: article }])).toEqual(
      [],
    );
  });
});
