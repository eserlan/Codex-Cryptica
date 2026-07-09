import { describe, it, expect, vi } from "vitest";
import {
  replaceEmojisWithIcons,
  labelValueHtml,
  renderGeneratorMarkdown,
  renderGeneratorLore,
} from "./markdown-renderers";

vi.mock("$app/environment", () => ({
  browser: true,
}));

describe("replaceEmojisWithIcons", () => {
  it("replaces known emojis with lucide icons", () => {
    const input = "Leader 👤 and Group 👥";
    const result = replaceEmojisWithIcons(input);
    expect(result).toContain("icon-[lucide--user]");
    expect(result).toContain("icon-[lucide--users]");
    expect(result).not.toContain("👤");
    expect(result).not.toContain("👥");
  });

  it("leaves unknown text untouched", () => {
    const input = "Just some plain text.";
    const result = replaceEmojisWithIcons(input);
    expect(result).toBe(input);
  });
});

describe("labelValueHtml", () => {
  it("renders default variant structure", () => {
    const result = labelValueHtml("Age", "1000");
    expect(result).toContain("seo-label");
    expect(result).toContain("Age");
    expect(result).toContain("1000");
    expect(result).toContain("flex-col mb-1");
  });

  it("renders names variant structure with copy button", () => {
    const result = labelValueHtml("Title", "Value", "names");
    expect(result).toContain("data-copy-text=");
    expect(result).toContain("icon-[lucide--copy]");
    expect(result).toContain("Title");
    expect(result).toContain("Value");
  });
});

describe("renderGeneratorMarkdown", () => {
  it("parses bullet points and replaces them with labelValueHtml output", () => {
    const input = "- **Name**: Bob";
    const result = renderGeneratorMarkdown(input, "default");
    expect(result).toContain("seo-label");
    expect(result).toContain("Name");
    expect(result).toContain("Bob");
  });

  it("handles plain key formats", () => {
    const input = "* Age: 42";
    const result = renderGeneratorMarkdown(input, "default");
    expect(result).toContain("seo-label");
    expect(result).toContain("Age");
    expect(result).toContain("42");
  });

  it("escapes raw HTML before rendering generator output", () => {
    const input = '- **Tone**: <img src="x" onerror="alert(1)"><script>alert(1)</script>';
    const result = renderGeneratorMarkdown(input, "default");
    const container = document.createElement("div");
    container.innerHTML = result;
    expect(result).not.toContain("<script>");
    expect(result).toContain("&lt;img");
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
  });
});

describe("renderGeneratorLore", () => {
  it("changes default flex-col margin for lore", () => {
    const input = "- **History**: Unknown";
    const result = renderGeneratorLore(input);
    expect(result).toContain("flex-col mb-5"); // Changed from mb-1
    expect(result).not.toContain("flex-col mb-1");
  });
});
