import { describe, it, expect, vi, beforeEach } from "vitest";

const paths = vi.hoisted(() => ({ base: "" }));

// SvelteKit 3 semantics: a non-route id is prefixed with `${base}/`, so
// resolve("") is "/" at the root and "/codex/" under a base path.
vi.mock("$app/paths", () => ({
  resolve: (id: string) => (id.startsWith("/") ? id : `${paths.base}/${id}`),
}));

import { basePath } from "./base-path";

describe("basePath", () => {
  beforeEach(() => {
    paths.base = "";
  });

  it("is empty at the site root so hrefs stay root-relative", () => {
    expect(basePath()).toBe("");
    expect(`${basePath()}/answers`).toBe("/answers");
  });

  it("keeps a non-root base path without the trailing slash", () => {
    paths.base = "/codex";
    expect(basePath()).toBe("/codex");
    expect(`${basePath()}/answers`).toBe("/codex/answers");
  });

  it("never produces a protocol-relative URL", () => {
    expect(`${basePath()}/tools/idea-developer`).not.toMatch(/^\/\//);
  });

  it.each([
    [".", "./tools/idea-developer"],
    ["..", "../tools/idea-developer"],
    ["../..", "../../tools/idea-developer"],
  ])(
    "keeps a single slash after the relative prerender base %s/",
    (base, expected) => {
      paths.base = base;
      expect(`${basePath()}/tools/idea-developer`).toBe(expected);
    },
  );
});
