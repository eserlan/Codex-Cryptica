import { describe, expect, test } from "bun:test";
import {
  filterAnswerPageFiles,
  filterFormattableFiles,
  filterLintableFiles,
  isIgnoredPath,
  touchesDiscoveryContent,
} from "./lint-changed.mjs";

describe("lint-changed", () => {
  test("selects changed Answer pages for the editorial check", () => {
    const page =
      "apps/web/src/lib/content/answers/pages/how-do-i-prepare-a-dnd-session.ts";
    expect(
      filterAnswerPageFiles([
        page,
        "apps/web/src/lib/content/answers/registry.test.ts",
        "apps/web/src/lib/content/answers/pages/deleted-answer.ts",
        "apps/web/src/lib/content/blog/front-page.md",
      ]),
    ).toEqual([page]);
  });

  test("detects changes to discovery content that need mesh and intent checks", () => {
    expect(
      touchesDiscoveryContent([
        "apps/web/src/lib/content/help/tales-of-the-valiant.md",
      ]),
    ).toBe(true);
    expect(
      touchesDiscoveryContent(["apps/web/src/lib/content/for/packs/index.ts"]),
    ).toBe(true);
  });

  test("ignores changes outside discovery content", () => {
    expect(
      touchesDiscoveryContent([
        "apps/web/src/lib/content/blog/front-page.md",
        "apps/web/src/routes/+page.svelte",
      ]),
    ).toBe(false);
    expect(touchesDiscoveryContent([])).toBe(false);
  });

  test("identifies ignored directory paths", () => {
    expect(isIgnoredPath("node_modules/pkg/index.js")).toBe(true);
    expect(isIgnoredPath(".svelte-kit/types/src/routes.d.ts")).toBe(true);
    expect(isIgnoredPath("build/index.html")).toBe(true);
    expect(isIgnoredPath("apps/web/src/routes/+page.svelte")).toBe(false);
  });

  test("filters lintable files based on extension and existence", () => {
    const files = [
      "package.json",
      "apps/web/src/lib/components/generators/GeneratorConfigForm.svelte",
      "nonexistent-file.ts",
      "node_modules/dummy/index.ts",
    ];
    const filtered = filterLintableFiles(files);
    expect(filtered).toContain(
      "apps/web/src/lib/components/generators/GeneratorConfigForm.svelte",
    );
    expect(filtered).not.toContain("package.json");
    expect(filtered).not.toContain("nonexistent-file.ts");
    expect(filtered).not.toContain("node_modules/dummy/index.ts");
  });

  test("filters formattable files including markdown and json", () => {
    const files = [
      "package.json",
      "README.md",
      "apps/web/src/lib/components/generators/GeneratorConfigForm.svelte",
      "node_modules/dummy/README.md",
    ];
    const filtered = filterFormattableFiles(files);
    expect(filtered).toContain("package.json");
    expect(filtered).toContain("README.md");
    expect(filtered).toContain(
      "apps/web/src/lib/components/generators/GeneratorConfigForm.svelte",
    );
    expect(filtered).not.toContain("node_modules/dummy/README.md");
  });
});
