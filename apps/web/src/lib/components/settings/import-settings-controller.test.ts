/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";
import {
  isScabardExport,
  mapThemeToGenre,
} from "./import-settings-controller.svelte";

describe("import-settings-controller helpers", () => {
  it("maps workspace and unknown themes to fantasy", () => {
    expect(mapThemeToGenre("workspace")).toBe("fantasy");
    expect(mapThemeToGenre("")).toBe("fantasy");
  });

  it("maps known alternate theme ids to their importer genres", () => {
    expect(mapThemeToGenre("fallout")).toBe("apocalyptic");
    expect(mapThemeToGenre("modern")).toBe("cyberpunk");
    expect(mapThemeToGenre("western")).toBe("steampunk");
    expect(mapThemeToGenre("space-opera-resistance")).toBe("scifi");
  });

  it("detects scabard exports from pages and conns arrays", () => {
    expect(isScabardExport({ pages: [], conns: [] })).toBe(true);
    expect(isScabardExport({ pages: [], conns: {}, foo: "bar" })).toBe(false);
    expect(isScabardExport(null)).toBe(false);
  });
});
