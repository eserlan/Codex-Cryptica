import { describe, expect, test } from "bun:test";
import {
  filterFormattableFiles,
  filterLintableFiles,
  isIgnoredPath,
} from "./lint-changed.mjs";

describe("lint-changed", () => {
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
