import { describe, expect, it } from "vitest";
import { genreForTheme, worldStyleForTheme } from "./world-style";

describe("worldStyleForTheme", () => {
  it("maps a genre theme to its name and description", () => {
    const style = worldStyleForTheme("cyberpunk");
    expect(style?.name).toBe("Neon Night");
    expect(style?.description).toContain("Cyberpunk");
  });

  it("ignores light and dark variant suffixes", () => {
    expect(worldStyleForTheme("horror_dark")).toEqual(
      worldStyleForTheme("horror"),
    );
  });

  it.each([undefined, null, "", "workspace", "workspace_light", "nope"])(
    "returns no style for %s",
    (id) => {
      expect(worldStyleForTheme(id)).toBeUndefined();
    },
  );

  it("does not resolve inherited object keys", () => {
    expect(worldStyleForTheme("constructor")).toBeUndefined();
    expect(worldStyleForTheme("__proto__")).toBeUndefined();
  });
});

describe("genreForTheme", () => {
  it("resolves a genre label under every appearance suffix", () => {
    for (const id of ["starwars", "starwars_dark", "fallout_light", "horror"]) {
      expect(genreForTheme(id)).toBeTruthy();
    }
    expect(genreForTheme("cyberpunk_dark")).toBe("Cyberpunk / Corporate");
  });

  it.each([undefined, null, "", "workspace", "nope", "constructor"])(
    "returns no genre for %s",
    (id) => {
      expect(genreForTheme(id)).toBeUndefined();
    },
  );
});
