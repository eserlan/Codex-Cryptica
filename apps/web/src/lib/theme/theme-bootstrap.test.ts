import { describe, expect, it } from "vitest";
import { themeBootstrapScript } from "./theme-bootstrap";

describe("themeBootstrapScript", () => {
  it("emits a pre-paint applyTheme call for a genre theme", () => {
    const script = themeBootstrapScript("fantasy");
    expect(script).toContain("window.__codexApplyTheme");
    expect(script).toContain('"fantasy"');
    expect(script.startsWith("<script>")).toBe(true);
    expect(script.endsWith("</script>")).toBe(true);
  });

  it("emits nothing for the workspace default or no theme", () => {
    expect(themeBootstrapScript("workspace")).toBe("");
    expect(themeBootstrapScript(null)).toBe("");
    expect(themeBootstrapScript(undefined)).toBe("");
    expect(themeBootstrapScript("")).toBe("");
  });

  it("cannot be closed early by a hostile theme id", () => {
    const script = themeBootstrapScript("x</script><script>alert(1)");
    expect(script).not.toContain("</script><script>");
    expect(script).toContain("\\u003C/script>");
  });
});
