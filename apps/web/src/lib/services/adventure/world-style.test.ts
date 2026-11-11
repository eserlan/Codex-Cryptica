import { describe, expect, it } from "vitest";
import { worldStyleForTheme } from "./world-style";

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
